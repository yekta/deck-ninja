"use client";

import { useAuth } from "@/components/auth-provider";
import { NDeck } from "@/components/n-deck";
import { useNow } from "@/components/now-provider";
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
import { useCards, useCreateCard } from "@/hooks/data/use-cards";
import {
  useCreateDeck,
  useDecks,
  useDeleteDeck,
  useUpdateDeck,
  type Deck,
} from "@/hooks/data/use-decks";
import { useTodayReviewLogs } from "@/hooks/data/use-review-logs";
import {
  DEFAULT_MAX_REVIEWS_PER_DAY,
  DEFAULT_NEW_CARDS_PER_DAY,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Logo from "@/components/icons/logo";
import { Navbar } from "@/components/navbar";

export default function Home() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const nowTime = useNow();

  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deckToRename, setDeckToRename] = useState<Deck | null>(null);
  const [renameDeckName, setRenameDeckName] = useState("");
  const [renameDeckDesc, setRenameDeckDesc] = useState("");
  const [renameNewCardsPerDay, setRenameNewCardsPerDay] = useState(
    DEFAULT_NEW_CARDS_PER_DAY,
  );
  const [renameMaxReviewsPerDay, setRenameMaxReviewsPerDay] = useState(
    DEFAULT_MAX_REVIEWS_PER_DAY,
  );
  const [deckToAddCard, setDeckToAddCard] = useState<Deck | null>(null);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const { data: decks = [], isPending: isPendingDecks } = useDecks();
  const { data: cards = [], isPending: isPendingCards } = useCards();
  const { data: todayReviewLogs = [] } = useTodayReviewLogs();

  const isPending = isPendingDecks || isPendingCards;

  const createDeckMutation = useCreateDeck();
  const deleteDeckMutation = useDeleteDeck();
  const renameDeckMutation = useUpdateDeck();
  const addCardMutation = useCreateCard();

  const getDeckStats = (deckId: string) => {
    const deckCards = cards.filter((c) => c.deck_id === deckId);
    const deck = decks.find((d) => d.id === deckId);
    const now = new Date();

    const deckCardIds = new Set(deckCards.map((c) => c.id));
    const deckTodayLogs = todayReviewLogs.filter((l) =>
      deckCardIds.has(l.card_id),
    );

    const newReviewedToday = new Set(
      deckTodayLogs.filter((l) => l.state === "new").map((l) => l.card_id),
    ).size;
    const reviewReviewedToday = new Set(
      deckTodayLogs.filter((l) => l.state === "review").map((l) => l.card_id),
    ).size;

    const newCardsPerDay = deck?.new_cards_per_day ?? DEFAULT_NEW_CARDS_PER_DAY;
    const maxReviewsPerDay =
      deck?.max_reviews_per_day ?? DEFAULT_MAX_REVIEWS_PER_DAY;

    const totalNewCards = deckCards.filter((c) => c.state === "new").length;
    const learnCards = deckCards.filter(
      (c) =>
        (c.state === "learning" || c.state === "relearning") &&
        new Date(c.due) <= now,
    ).length;
    const totalDueCards = deckCards.filter(
      (c) => c.state === "review" && new Date(c.due) <= now,
    ).length;

    const newLimit = Math.max(0, newCardsPerDay - newReviewedToday);
    const reviewLimit = Math.max(0, maxReviewsPerDay - reviewReviewedToday);

    const latestCardCreatedAt = deckCards.reduce((latest, card) => {
      if (!card.created_at) return latest;
      return Math.max(latest, new Date(card.created_at).getTime());
    }, 0);

    return {
      total: deckCards.length,
      new: Math.min(totalNewCards, newLimit),
      learn: learnCards,
      due: Math.min(totalDueCards, reviewLimit),
      latestCardCreatedAt,
    };
  };

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    createDeckMutation.mutate(
      { name: newDeckName, description: newDeckDesc },
      {
        onSuccess: (id) => {
          setNewDeckName("");
          setNewDeckDesc("");
          setIsDialogOpen(false);
          router.push(`/deck/${id}`);
        },
      },
    );
  };

  const handleDeleteDeck = () => {
    if (!deckToDelete || deleteConfirmation !== "I want to delete this deck")
      return;
    deleteDeckMutation.mutate(
      { id: deckToDelete.id },
      {
        onSuccess: () => {
          setDeckToDelete(null);
          setDeleteConfirmation("");
        },
      },
    );
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
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <Logo className="mx-auto size-16" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            DeckNinja
          </h1>
          <p className="text-lg text-muted-foreground">
            Master any subject with spaced repetition. Sign in to start
            learning.
          </p>
          <Button
            size="lg"
            onClick={handleSignIn}
            className="w-full max-w-64"
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
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto p-5 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className={cn(
              "text-2xl font-bold tracking-tight truncate min-w-0",
              showPlaceholder &&
                "text-transparent bg-skeleton animate-pulse rounded w-48 select-none",
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
                setRenameDeckDesc("");
                setRenameNewCardsPerDay(DEFAULT_NEW_CARDS_PER_DAY);
                setRenameMaxReviewsPerDay(DEFAULT_MAX_REVIEWS_PER_DAY);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Update the name, description, or daily limits for this deck.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rename-deck">Name</Label>
                  <Input
                    id="rename-deck"
                    value={renameDeckName}
                    onChange={(e) => setRenameDeckName(e.target.value)}
                    placeholder="Deck Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rename-deck-desc">
                    Description (optional)
                  </Label>
                  <Input
                    id="rename-deck-desc"
                    value={renameDeckDesc}
                    onChange={(e) => setRenameDeckDesc(e.target.value)}
                    placeholder="e.g. Words from chapter 1-5"
                  />
                </div>
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium">Daily Limits</p>
                  <div className="space-y-2">
                    <Label htmlFor="new-cards-per-day">New cards/day</Label>
                    <Input
                      id="new-cards-per-day"
                      type="number"
                      min={0}
                      value={renameNewCardsPerDay}
                      onChange={(e) =>
                        setRenameNewCardsPerDay(
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      The maximum number of new cards to introduce in a day.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-reviews-per-day">
                      Maximum reviews/day
                    </Label>
                    <Input
                      id="max-reviews-per-day"
                      type="number"
                      min={0}
                      value={renameMaxReviewsPerDay}
                      onChange={(e) =>
                        setRenameMaxReviewsPerDay(
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      The maximum number of review cards to show in a day.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeckToRename(null);
                    setRenameDeckName("");
                    setRenameDeckDesc("");
                    setRenameNewCardsPerDay(DEFAULT_NEW_CARDS_PER_DAY);
                    setRenameMaxReviewsPerDay(DEFAULT_MAX_REVIEWS_PER_DAY);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!deckToRename) return;
                    renameDeckMutation.mutate(
                      {
                        id: deckToRename.id,
                        name: renameDeckName,
                        description: renameDeckDesc,
                        new_cards_per_day: renameNewCardsPerDay,
                        max_reviews_per_day: renameMaxReviewsPerDay,
                      },
                      {
                        onSuccess: () => {
                          setDeckToRename(null);
                          setRenameDeckName("");
                          setRenameDeckDesc("");
                          setRenameNewCardsPerDay(DEFAULT_NEW_CARDS_PER_DAY);
                          setRenameMaxReviewsPerDay(
                            DEFAULT_MAX_REVIEWS_PER_DAY,
                          );
                        },
                      },
                    );
                  }}
                  disabled={
                    !renameDeckName.trim() ||
                    (renameDeckName.trim() === deckToRename?.name &&
                      renameDeckDesc.trim() ===
                        (deckToRename?.description ?? "") &&
                      renameNewCardsPerDay ===
                        (deckToRename?.new_cards_per_day ??
                          DEFAULT_NEW_CARDS_PER_DAY) &&
                      renameMaxReviewsPerDay ===
                        (deckToRename?.max_reviews_per_day ??
                          DEFAULT_MAX_REVIEWS_PER_DAY))
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
                  if (!deckToAddCard) return;
                  addCardMutation.mutate(
                    {
                      deckId: deckToAddCard.id,
                      front: newCardFront,
                      back: newCardBack,
                    },
                    {
                      onSuccess: () => {
                        setDeckToAddCard(null);
                        setNewCardFront("");
                        setNewCardBack("");
                      },
                    },
                  );
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
                  <p className="text-sm text-muted-foreground mb-2">
                    Please type{" "}
                    <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-mono font-medium">
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
                      "text-transparent bg-skeleton animate-pulse border-transparent pointer-events-none hover:bg-skeleton",
                  )}
                />
              }
            >
              <Plus className={cn("h-4 w-4", showPlaceholder && "opacity-0")} />
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
        <DecksSection
          showPlaceholder={showPlaceholder}
          decks={decks}
          getDeckStats={getDeckStats}
          nowTime={nowTime}
          onCreateDeck={() => setIsDialogOpen(true)}
          onAddCard={(deck) => setDeckToAddCard(deck)}
          onEdit={(deck) => {
            setDeckToRename(deck);
            setRenameDeckName(deck.name);
            setRenameDeckDesc(deck.description ?? "");
            setRenameNewCardsPerDay(
              deck.new_cards_per_day ?? DEFAULT_NEW_CARDS_PER_DAY,
            );
            setRenameMaxReviewsPerDay(
              deck.max_reviews_per_day ?? DEFAULT_MAX_REVIEWS_PER_DAY,
            );
          }}
          onDelete={(deck) => setDeckToDelete(deck)}
        />
      </main>
    </div>
  );
}

interface DeckStats {
  total: number;
  new: number;
  learn: number;
  due: number;
  latestCardCreatedAt: number;
}

function DecksSection({
  showPlaceholder,
  decks,
  getDeckStats,
  nowTime,
  onCreateDeck,
  onAddCard,
  onEdit,
  onDelete,
}: {
  showPlaceholder: boolean;
  decks: Deck[];
  getDeckStats: (deckId: string) => DeckStats;
  nowTime: number;
  onCreateDeck: () => void;
  onAddCard: (deck: Deck) => void;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}) {
  if (showPlaceholder) {
    return (
      <DeckWrapper>
        {Array.from({ length: 9 }).map((_, i) => (
          <NDeck key={i} isPlaceholder />
        ))}
      </DeckWrapper>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="text-center py-20 bg-background rounded-lg border border-dashed">
        <h3 className="text-lg font-medium text-foreground mb-2">
          No decks yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Create your first deck to start adding flashcards.
        </p>
        <Button onClick={onCreateDeck}>
          <Plus className="h-4 w-4" />
          Create Deck
        </Button>
      </div>
    );
  }

  return (
    <DeckWrapper>
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
            onAddCard={() => onAddCard(deck)}
            onEdit={() => onEdit(deck)}
            onDelete={() => onDelete(deck)}
          />
        );
      })}
    </DeckWrapper>
  );
}

function DeckWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-2 pb-16">
      {children}
    </div>
  );
}
