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
import { supabase } from "@/lib/supabase";
import { handleDbError, OperationType } from "@/lib/db-error";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  next_review_date: string;
  repetition: number;
}

export default function DeckPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const { data: deckName = "Loading...", isPending: isPendingDecks } = useQuery(
    {
      queryKey: ["deck", id],
      queryFn: async () => {
        if (!user || !id) return "Loading...";
        const { data, error } = await supabase
          .from("decks")
          .select("name")
          .eq("id", id)
          .single();
        if (error || !data) {
          router.push("/");
          return "Deck not found";
        }
        return data.name as string;
      },
      enabled: !!user && !!id,
    },
  );

  const { data: cards = [], isPending: isPendingCards } = useQuery({
    queryKey: ["cards", id, user?.id],
    queryFn: async () => {
      if (!user || !id) return [];
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", id);
      if (error) await handleDbError(error, OperationType.GET, "cards");
      return (data ?? []) as Flashcard[];
    },
    enabled: !!user && !!id,
  });

  const isPending = isPendingDecks || isPendingCards;

  const addCardMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newFront.trim() || !newBack.trim())
        throw new Error("Missing data");
      const { error } = await supabase.from("cards").insert({
        deck_id: id,
        user_id: user.id,
        front: newFront.trim(),
        back: newBack.trim(),
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
      });
      if (error) await handleDbError(error, OperationType.CREATE, "cards");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["studyCards", id, user?.id] });
      setNewFront("");
      setNewBack("");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async () => {
      if (!cardToDelete) throw new Error("No card to delete");
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardToDelete);
      if (error)
        await handleDbError(
          error,
          OperationType.DELETE,
          `cards/${cardToDelete}`,
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["studyCards", id, user?.id] });
      setCardToDelete(null);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const editCardMutation = useMutation({
    mutationFn: async () => {
      if (!user || !cardToEdit || !editFront.trim() || !editBack.trim())
        throw new Error("Missing data");
      const { error } = await supabase
        .from("cards")
        .update({
          front: editFront.trim(),
          back: editBack.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardToEdit.id);
      if (error)
        await handleDbError(
          error,
          OperationType.UPDATE,
          `cards/${cardToEdit.id}`,
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["studyCards", id, user?.id] });
      setCardToEdit(null);
      setEditFront("");
      setEditBack("");
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    addCardMutation.mutate();
  };

  const handleDeleteCard = () => {
    deleteCardMutation.mutate();
  };

  const handleEditCard = (e: React.FormEvent) => {
    e.preventDefault();
    editCardMutation.mutate();
  };

  if (!loading && !user) return null;

  const showPlaceholder = loading || isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        backHref="/"
        title={
          showPlaceholder ? (
            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
          ) : (
            deckName
          )
        }
        rightActions={
          showPlaceholder ? (
            <Button className="text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200">
              &nbsp;
            </Button>
          ) : (
            <Link href={`/study/${id}`}>
              <Button>Study Deck</Button>
            </Link>
          )
        }
      />

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className={cn(
              "text-2xl font-bold tracking-tight truncate min-w-0",
              showPlaceholder &&
                "text-transparent bg-slate-200 animate-pulse rounded w-32 select-none",
            )}
          >
            {showPlaceholder ? "\u00a0" : `Cards (${cards.length})`}
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
                  <DialogTitle>Edit flashcard</DialogTitle>
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
                      "text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200",
                  )}
                />
              }
            >
              <Plus className={cn("h-4 w-4 mr-2", showPlaceholder && "opacity-0")} />
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
          <div className="text-center py-20 bg-white rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No cards yet
            </h3>
            <p className="text-slate-500 mb-6">
              Add your first flashcard to this deck.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
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
