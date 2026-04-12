"use client";

import { useAuth } from "@/components/auth-provider";
import {
  EmptyList,
  EmptyListContent,
  EmptyListDescription,
  EmptyListFooter,
  EmptyListHeader,
  EmptyListIcon,
  EmptyListTitle,
} from "@/components/empty-list";
import CardsIcon from "@/components/icons/cards";
import { NCardManage } from "@/components/n-card-manage";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCardsByDeck,
  useCreateCard,
  useDeleteCard,
  useUpdateCard,
  type TCard,
} from "@/hooks/data/use-cards";
import { useDeck } from "@/hooks/data/use-decks";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useState } from "react";
import { z } from "zod";

const cardSchema = z.object({
  front: z.string().trim().min(1, "Front is required"),
  back: z.string().trim().min(1, "Back is required"),
});

export default function DeckPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [cardToEdit, setCardToEdit] = useState<TCard | null>(null);

  const { data: deckData, isPending: isPendingDecks } = useDeck(id);
  const { data: cards = [], isPending: isPendingCards } = useCardsByDeck(id);

  // Redirect home if the deck doesn't exist (or was deleted).
  useEffect(() => {
    if (!isPendingDecks && user && id && deckData === null) {
      router.push("/");
    }
  }, [isPendingDecks, deckData, user, id, router]);

  const deckName = deckData?.name ?? "Loading...";

  const isPending = isPendingDecks || isPendingCards;

  const deleteCardMutation = useDeleteCard();

  const handleDeleteCard = () => {
    if (!cardToDelete) return;
    deleteCardMutation.mutate(
      { id: cardToDelete, deckId: id },
      { onSuccess: () => setCardToDelete(null) },
    );
  };

  if (!loading && !user) return null;

  const showPlaceholder = loading || isPending;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 pt-4 pb-16 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href="/" className="shrink-0 -ml-2">
              <Button variant="ghost" size="icon" className="size-9">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            {showPlaceholder ? (
              <div className="h-7 w-48 bg-skeleton animate-pulse rounded" />
            ) : (
              <h1 className="text-xl font-semibold truncate min-w-0">
                {deckName}
              </h1>
            )}
          </div>
          {showPlaceholder ? (
            <Button className="text-transparent bg-skeleton animate-pulse border-transparent pointer-events-none hover:bg-skeleton">
              Study Deck
            </Button>
          ) : (
            <Link href={`/study/${id}`}>
              <Button>Study Deck</Button>
            </Link>
          )}
        </div>

        <div className="w-full h-px bg-border rounded-full" />

        <div className="flex items-center justify-between gap-4">
          <h2
            className={cn(
              "text-2xl font-bold tracking-tight truncate min-w-0",
              showPlaceholder &&
                "text-transparent bg-skeleton animate-pulse rounded w-32 select-none",
            )}
          >
            Cards{" "}
            {!showPlaceholder && (
              <span className="font-normal text-muted-foreground">
                ({cards.length})
              </span>
            )}
          </h2>

          <Dialog
            open={cardToDelete !== null}
            onOpenChange={(open) => !open && setCardToDelete(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Card</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this card? This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCardToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCard}
                  isPending={deleteCardMutation.isPending}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={cardToEdit !== null}
            onOpenChange={(open) => !open && setCardToEdit(null)}
          >
            <DialogContent>
              {cardToEdit && (
                <EditCardForm
                  card={cardToEdit}
                  deckId={id}
                  onDone={() => setCardToEdit(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
            <DialogTrigger
              render={
                <Button
                  className={cn(
                    "shrink-0",
                    showPlaceholder &&
                      "text-transparent bg-skeleton animate-pulse border-transparent pointer-events-none hover:bg-skeleton",
                  )}
                />
              }
            >
              <Plus className={cn("h-4 w-4", showPlaceholder && "opacity-0")} />
              Add Card
            </DialogTrigger>
            <DialogContent>
              {isAddCardOpen && (
                <AddCardForm
                  deckId={id}
                  onDone={() => setIsAddCardOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {showPlaceholder ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <NCardManage key={i} isPlaceholder />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyList className="border border-dashed">
            <EmptyListHeader>
              <EmptyListIcon>
                <CardsIcon />
              </EmptyListIcon>
              <EmptyListContent>
                <EmptyListTitle>No cards yet</EmptyListTitle>
                <EmptyListDescription>
                  Add your first card to this deck.
                </EmptyListDescription>
              </EmptyListContent>
            </EmptyListHeader>
            <EmptyListFooter>
              <Button onClick={() => setIsAddCardOpen(true)}>Add Card</Button>
            </EmptyListFooter>
          </EmptyList>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <NCardManage
                key={card.id}
                id={card.id}
                front={card.front}
                back={card.back}
                onEdit={() => setCardToEdit(card)}
                onDelete={() => setCardToDelete(card.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AddCardForm({
  deckId,
  onDone,
}: {
  deckId: string;
  onDone: () => void;
}) {
  const mutation = useCreateCard();
  const form = useForm({
    defaultValues: { front: "", back: "" },
    validators: {
      onMount: cardSchema,
      onChange: cardSchema,
      onSubmit: cardSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        deckId,
        front: value.front,
        back: value.back,
      });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Add a new card</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <form.Field name="front">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Front (Question)</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="back">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Back (Answer)</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      </div>
      <DialogFooter>
        <form.Subscribe
          selector={(s) => ({
            canSubmit: s.canSubmit,
            isSubmitting: s.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              type="submit"
              disabled={!canSubmit}
              isPending={isSubmitting}
            >
              Add Card
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

function EditCardForm({
  card,
  deckId,
  onDone,
}: {
  card: TCard;
  deckId: string;
  onDone: () => void;
}) {
  const mutation = useUpdateCard();
  const form = useForm({
    defaultValues: { front: card.front, back: card.back },
    validators: {
      onMount: cardSchema,
      onChange: cardSchema,
      onSubmit: cardSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        id: card.id,
        deckId,
        front: value.front,
        back: value.back,
      });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Edit Card</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <form.Field name="front">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Front (Question)</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="back">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Back (Answer)</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <form.Subscribe
          selector={(s) => ({
            canSubmit: s.canSubmit,
            isSubmitting: s.isSubmitting,
            isDirty: s.isDirty,
          })}
        >
          {({ canSubmit, isSubmitting, isDirty }) => (
            <Button
              type="submit"
              disabled={!canSubmit || !isDirty}
              isPending={isSubmitting}
            >
              Save Changes
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
