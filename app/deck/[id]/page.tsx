"use client";

import { useAuth } from "@/components/auth-provider";
import { NCard } from "@/components/n-card";
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
  type Flashcard,
} from "@/hooks/data/use-cards";
import { useDeck } from "@/hooks/data/use-decks";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DeckPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

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

  const addCardMutation = useCreateCard();
  const deleteCardMutation = useDeleteCard();
  const editCardMutation = useUpdateCard();

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    addCardMutation.mutate(
      { deckId: id, front: newFront, back: newBack },
      {
        onSuccess: () => {
          setNewFront("");
          setNewBack("");
          setIsDialogOpen(false);
        },
      },
    );
  };

  const handleDeleteCard = () => {
    if (!cardToDelete) return;
    deleteCardMutation.mutate(
      { id: cardToDelete, deckId: id },
      { onSuccess: () => setCardToDelete(null) },
    );
  };

  const handleEditCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardToEdit) return;
    editCardMutation.mutate(
      {
        id: cardToEdit.id,
        deckId: id,
        front: editFront,
        back: editBack,
      },
      {
        onSuccess: () => {
          setCardToEdit(null);
          setEditFront("");
          setEditBack("");
        },
      },
    );
  };

  if (!loading && !user) return null;

  const showPlaceholder = loading || isPending;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto p-5 pb-16 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href="/" className="shrink-0 -ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
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
              &nbsp;
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
            {showPlaceholder ? "\u00a0" : `Cards`}{" "}
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
                  Are you sure you want to delete this flashcard? This action
                  cannot be undone.
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
              <form onSubmit={handleEditCard}>
                <DialogHeader>
                  <DialogTitle>Edit Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-front">Front (Question)</Label>
                    <Input
                      id="edit-front"
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-back">Back (Answer)</Label>
                    <Input
                      id="edit-back"
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCardToEdit(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!editFront.trim() || !editBack.trim()}
                    isPending={editCardMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              {showPlaceholder ? "\u00a0" : "Add Card"}
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddCard}>
                <DialogHeader>
                  <DialogTitle>Add a new flashcard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="front">Front (Question)</Label>
                    <Input
                      id="front"
                      value={newFront}
                      onChange={(e) => setNewFront(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="back">Back (Answer)</Label>
                    <Input
                      id="back"
                      value={newBack}
                      onChange={(e) => setNewBack(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!newFront.trim() || !newBack.trim()}
                    isPending={addCardMutation.isPending}
                  >
                    Add Card
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {showPlaceholder ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <NCard key={i} isPlaceholder />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20 bg-background rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No cards yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Add your first flashcard to this deck.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <NCard
                key={card.id}
                id={card.id}
                front={card.front}
                back={card.back}
                onEdit={() => {
                  setCardToEdit(card);
                  setEditFront(card.front);
                  setEditBack(card.back);
                }}
                onDelete={() => setCardToDelete(card.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
