"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { handleDbError, OperationType } from "@/lib/db-error";
import { useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  Plus,
  LogOut,
  Trash2,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNow } from "@/components/now-provider";
import { cn } from "@/lib/utils";

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
  interval: number;
  repetition: number;
  next_review_date: string;
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

  const { data: decks = [], isLoading: isDecksLoading } = useQuery({
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

  const { data: cards = [], isLoading: isCardsLoading } = useQuery({
    queryKey: ["cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("cards").select("*");
      if (error) await handleDbError(error, OperationType.GET, "cards");
      return (data ?? []) as Flashcard[];
    },
    enabled: !!user,
  });

  const isFetching = isDecksLoading || isCardsLoading;

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
        interval: 0,
        repetition: 0,
        ease_factor: 2.5,
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

    const newCards = deckCards.filter((c) => c.interval === 0).length;
    const learnCards = deckCards.filter(
      (c) =>
        c.interval > 0 &&
        c.repetition === 0 &&
        new Date(c.next_review_date) <= now,
    ).length;
    const dueCards = deckCards.filter(
      (c) =>
        c.interval > 0 &&
        c.repetition > 0 &&
        new Date(c.next_review_date) <= now,
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

  if (loading || (user && isFetching)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="max-w-5xl mx-auto p-6 space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-slate-200 animate-pulse rounded w-48 max-w-full shrink">
              &nbsp;
            </h2>
            <Button className="text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200 shrink-0">
              <Plus className="h-4 w-4 mr-2 opacity-0" />
              &nbsp;
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-4">
                  <div className="space-y-2 w-full min-w-0">
                    <CardTitle className="text-transparent bg-slate-200 animate-pulse rounded w-3/4 truncate">
                      &nbsp;
                    </CardTitle>
                    <CardDescription className="text-transparent bg-slate-200 animate-pulse rounded w-full truncate">
                      &nbsp;
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-slate-200 animate-pulse pointer-events-none hover:bg-slate-200 shrink-0"
                  >
                    <MoreVertical className="h-4 w-4 opacity-0" />
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 min-w-0">
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="text-sm font-medium text-transparent bg-slate-200 animate-pulse rounded w-24">
                      &nbsp;
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                      <div className="flex items-center gap-1.5 text-transparent bg-slate-200 animate-pulse rounded w-16">
                        &nbsp;
                      </div>
                      <div className="flex items-center gap-1.5 text-transparent bg-slate-200 animate-pulse rounded w-16">
                        &nbsp;
                      </div>
                      <div className="flex items-center gap-1.5 text-transparent bg-slate-200 animate-pulse rounded w-16">
                        &nbsp;
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    className="w-full text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200"
                  >
                    &nbsp;
                  </Button>
                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200"
                    >
                      &nbsp;
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200"
                    >
                      &nbsp;
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center space-y-6">
          <BrainCircuit className="mx-auto h-16 w-16 text-blue-600" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            DeckNinja
          </h1>
          <p className="text-lg text-slate-600">
            Master any subject with our spaced repetition flashcard app. Sign in
            to create your decks and start learning.
          </p>
          <Button
            size="lg"
            onClick={handleSignIn}
            className="w-full"
            isLoading={isSigningIn}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight truncate min-w-0">
            Decks ({decks.length})
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
                  isLoading={renameDeckMutation.isPending}
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
                    isLoading={addCardMutation.isPending}
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
                  isLoading={deleteDeckMutation.isPending}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" />
              Create Deck
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
                    isLoading={createDeckMutation.isPending}
                  >
                    Create Deck
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {decks.length === 0 ? (
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
            {decks.map((deck) => (
              <Card key={deck.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="truncate">{deck.name}</CardTitle>
                    {deck.description && (
                      <CardDescription className="truncate">
                        {deck.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 h-8 w-8 shrink-0 focus-visible:outline-none">
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setDeckToRename(deck);
                          setRenameDeckName(deck.name);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename Deck
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => setDeckToDelete(deck)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Deck
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-1">
                  {(() => {
                    const stats = getDeckStats(deck.id);
                    const isRecentlyUpdated =
                      stats.latestCardCreatedAt > 0 &&
                      nowTime - stats.latestCardCreatedAt <= 5000;
                    return (
                      <div className="flex flex-col gap-3 mt-2">
                        <div
                          className={cn(
                            "text-sm font-medium w-fit transition-colors duration-300 rounded px-2 py-0.5 -ml-2",
                            isRecentlyUpdated
                              ? "bg-green-100 text-green-800"
                              : "text-slate-500 bg-transparent",
                          )}
                        >
                          {stats.total} {stats.total === 1 ? "card" : "cards"}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            {stats.new} New
                          </div>
                          <div className="flex items-center gap-1.5 text-red-600">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            {stats.learn} Learn
                          </div>
                          <div className="flex items-center gap-1.5 text-green-600">
                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                            {stats.due} Due
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Link href={`/study/${deck.id}`} className="w-full">
                    <Button variant="default" className="w-full">
                      Study
                    </Button>
                  </Link>
                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setDeckToAddCard(deck)}
                    >
                      Add Card
                    </Button>
                    <Link href={`/deck/${deck.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
