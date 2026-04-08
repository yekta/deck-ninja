"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { NDeck } from "@/components/n-deck";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { handleDbError, OperationType } from "@/lib/db-error";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BrainCircuit, Plus, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNow } from "@/components/now-provider";

import { Navbar } from "@/components/navbar";

interface Deck {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Flashcard {
  id: string;
  deck_id: string;
  due: string;
  state: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const queryClient = useQueryClient();
  const nowTime = useNow();

  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deckToRename, setDeckToRename] = useState<Deck | null>(null);
  const [renameDeckName, setRenameDeckName] = useState("");
  const [deckToAddCard, setDeckToAddCard] = useState<Deck | null>(null);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const { data: decks = [], isPending: isPendingDecks } = useQuery({
    queryKey: ["decks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) await handleDbError(error, OperationType.GET, "decks");
      return (data ?? []) as Deck[];
    },
    enabled: !!user,
  });

  const { data: cards = [], isPending: isPendingCards } = useQuery({
    queryKey: ["cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("cards").select("*");
      if (error) await handleDbError(error, OperationType.GET, "cards");
      return (data ?? []) as Flashcard[];
    },
    enabled: !!user,
  });

  const isPending = isPendingDecks || isPendingCards;

  const createDeckMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newDeckName.trim()) throw new Error("Missing data");
      const { data, error } = await supabase
        .from("decks")
        .insert({
          user_id: user.id,
          name: newDeckName.trim(),
          description: newDeckDesc.trim(),
        })
        .select("id")
        .single();
      if (error) await handleDbError(error, OperationType.CREATE, "decks");
      return data!.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["decks", user?.id] });
      setNewDeckName("");
      setNewDeckDesc("");
      setIsDialogOpen(false);
      router.push(`/deck/${id}`);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async () => {
      if (
        !user ||
        !deckToDelete ||
        deleteConfirmation !== "I want to delete this deck"
      )
        throw new Error("Invalid delete request");
      // Cards are deleted automatically via ON DELETE CASCADE
      const { error } = await supabase
        .from("decks")
        .delete()
        .eq("id", deckToDelete.id);
      if (error)
        await handleDbError(
          error,
          OperationType.DELETE,
          `decks/${deckToDelete.id}`,
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      if (deckToDelete) {
        queryClient.invalidateQueries({
          queryKey: ["cards", deckToDelete.id, user?.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["studyCards", deckToDelete.id, user?.id],
        });
      }
      setDeckToDelete(null);
      setDeleteConfirmation("");
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const renameDeckMutation = useMutation({
    mutationFn: async () => {
      if (!user || !deckToRename || !renameDeckName.trim())
        throw new Error("Invalid rename request");
      const { error } = await supabase
        .from("decks")
        .update({
          name: renameDeckName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", deckToRename.id);
      if (error)
        await handleDbError(
          error,
          OperationType.UPDATE,
          `decks/${deckToRename.id}`,
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks", user?.id] });
      setDeckToRename(null);
      setRenameDeckName("");
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const addCardMutation = useMutation({
    mutationFn: async () => {
      if (
        !user ||
        !deckToAddCard ||
        !newCardFront.trim() ||
        !newCardBack.trim()
      )
        throw new Error("Missing data");
      const { error } = await supabase.from("cards").insert({
        deck_id: deckToAddCard.id,
        user_id: user.id,
        front: newCardFront.trim(),
        back: newCardBack.trim(),
      });
      if (error) await handleDbError(error, OperationType.CREATE, "cards");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      if (deckToAddCard) {
        queryClient.invalidateQueries({
          queryKey: ["cards", deckToAddCard.id, user?.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["studyCards", deckToAddCard.id, user?.id],
        });
      }
      setDeckToAddCard(null);
      setNewCardFront("");
      setNewCardBack("");
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const getDeckStats = (deckId: string) => {
    const deckCards = cards.filter((c) => c.deck_id === deckId);
    const now = new Date();

    const newCards = deckCards.filter((c) => c.state === "new").length;
    const learnCards = deckCards.filter(
      (c) =>
        (c.state === "learning" || c.state === "relearning") &&
        new Date(c.due) <= now,
    ).length;
    const dueCards = deckCards.filter(
      (c) => c.state === "review" && new Date(c.due) <= now,
    ).length;

    const latestCardCreatedAt = deckCards.reduce((latest, card) => {
      if (!card.created_at) return latest;
      return Math.max(latest, new Date(card.created_at).getTime());
    }, 0);

    return {
      total: deckCards.length,
      new: newCards,
      learn: learnCards,
      due: dueCards,
      latestCardCreatedAt,
    };
  };

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    createDeckMutation.mutate();
  };

  const handleDeleteDeck = () => {
    deleteDeckMutation.mutate();
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!loading && !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center space-y-6">
          <BrainCircuit className="mx-auto h-16 w-16 text-blue-600" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            DeckNinja
          </h1>
          <p className="text-lg text-slate-600">
            Master any subject with spaced repetition. Sign in to start
            learning.
          </p>
          <Button
            size="lg"
            onClick={handleSignIn}
            className="w-full"
            isPending={isSigningIn}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  const showPlaceholder = loading || isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className={cn(
              "text-2xl font-bold tracking-tight truncate min-w-0",
              showPlaceholder &&
                "text-transparent bg-slate-200 animate-pulse rounded w-48 select-none",
            )}
          >
            {showPlaceholder ? "\u00a0" : `Decks`}{" "}
            {!showPlaceholder && (
              <span className="font-normal text-muted-foreground">
                ({decks.length})
              </span>
            )}
          </h2>

          <Dialog
            open={deckToRename !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDeckToRename(null);
                setRenameDeckName("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Deck</DialogTitle>
                <DialogDescription>
                  Enter a new name for this deck.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rename-deck">New Name</Label>
                  <Input
                    id="rename-deck"
                    value={renameDeckName}
                    onChange={(e) => setRenameDeckName(e.target.value)}
                    placeholder="Deck Name"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        renameDeckName.trim() &&
                        !renameDeckMutation.isPending
                      ) {
                        e.preventDefault();
                        renameDeckMutation.mutate();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeckToRename(null);
                    setRenameDeckName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => renameDeckMutation.mutate()}
                  disabled={
                    !renameDeckName.trim() ||
                    renameDeckName.trim() === deckToRename?.name
                  }
                  isPending={renameDeckMutation.isPending}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={deckToAddCard !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDeckToAddCard(null);
                setNewCardFront("");
                setNewCardBack("");
              }
            }}
          >
            <DialogContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCardMutation.mutate();
                }}
              >
                <DialogHeader>
                  <DialogTitle>
                    Add flashcard to {deckToAddCard?.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="front">Front</Label>
                    <Input
                      id="front"
                      placeholder="e.g. El perro"
                      value={newCardFront}
                      onChange={(e) => setNewCardFront(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="back">Back</Label>
                    <Input
                      id="back"
                      placeholder="e.g. The dog"
                      value={newCardBack}
                      onChange={(e) => setNewCardBack(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!newCardFront.trim() || !newCardBack.trim()}
                    isPending={addCardMutation.isPending}
                  >
                    Add Card
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={deckToDelete !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDeckToDelete(null);
                setDeleteConfirmation("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Deck</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the
                  deck "{deckToDelete?.name}" and all its flashcards.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 mb-2">
                    Please type{" "}
                    <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono font-medium">
                      I want to delete this deck
                    </span>{" "}
                    to confirm.
                  </p>
                  <Input
                    id="confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="I want to delete this deck"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeckToDelete(null);
                    setDeleteConfirmation("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteDeck}
                  disabled={deleteConfirmation !== "I want to delete this deck"}
                  isPending={deleteDeckMutation.isPending}
                >
                  Delete
                </Button>
              </DialogFooter>
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
              <Plus
                className={cn("h-4 w-4 mr-2", showPlaceholder && "opacity-0")}
              />
              {showPlaceholder ? "\u00a0" : "Create Deck"}
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateDeck}>
                <DialogHeader>
                  <DialogTitle>Create a new deck</DialogTitle>
                  <DialogDescription>
                    Organize your flashcards into decks by topic or subject.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Spanish Vocabulary"
                      value={newDeckName}
                      onChange={(e) => setNewDeckName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="e.g. Words from chapter 1-5"
                      value={newDeckDesc}
                      onChange={(e) => setNewDeckDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!newDeckName.trim()}
                    isPending={createDeckMutation.isPending}
                  >
                    Create Deck
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {showPlaceholder ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <NDeck key={i} isPlaceholder />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No decks yet
            </h3>
            <p className="text-slate-500 mb-6">
              Create your first deck to start adding flashcards.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Deck
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => {
              const stats = getDeckStats(deck.id);
              const isRecentlyUpdated =
                stats.latestCardCreatedAt > 0 &&
                nowTime - stats.latestCardCreatedAt <= 5000;
              return (
                <NDeck
                  key={deck.id}
                  id={deck.id}
                  name={deck.name}
                  description={deck.description}
                  totalCards={stats.total}
                  newCount={stats.new}
                  learningCount={stats.learn}
                  dueCount={stats.due}
                  isRecentlyUpdated={isRecentlyUpdated}
                  studyHref={`/study/${deck.id}`}
                  manageHref={`/deck/${deck.id}`}
                  onAddCard={() => setDeckToAddCard(deck)}
                  onRename={() => {
                    setDeckToRename(deck);
                    setRenameDeckName(deck.name);
                  }}
                  onDelete={() => setDeckToDelete(deck)}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
