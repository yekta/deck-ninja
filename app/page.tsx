"use client";

import { useAuth } from "@/components/auth-provider";
import { NDeck } from "@/components/n-deck";
import { useNow } from "@/components/now-provider";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { useCards } from "@/hooks/data/use-cards";
import {
  useCreateDeck,
  useDecks,
  useDeleteDeck,
  useUpdateDeck,
  type TDeck,
} from "@/hooks/data/use-decks";
import { useLearningProfiles } from "@/hooks/data/use-learning-profiles";
import { useTodayReviewLogs } from "@/hooks/data/use-review-logs";
import { useTodayStats } from "@/hooks/data/use-stats";
import {
  DEFAULT_MAX_REVIEWS_PER_DAY,
  DEFAULT_NEW_CARDS_PER_DAY,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Navbar } from "@/components/navbar";
import SignInForm from "@/components/sign-in-form";
import { formatDuration, intervalToDuration } from "date-fns";
import { useAsyncRouterPush } from "@/hooks/use-async-router-push";

const DELETE_DECK_CONFIRMATION = "I want to delete this deck";

const createDeckSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim(),
  learning_profile_id: z.uuid(),
});

const deckSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim(),
  learning_profile_id: z.uuid(),
});

const deleteDeckSchema = z.object({
  confirmation: z
    .string()
    .refine(
      (v) => v === DELETE_DECK_CONFIRMATION,
      "Confirmation text does not match",
    ),
});

export default function Home() {
  const [asyncRouterPush] = useAsyncRouterPush();
  const { user, loading } = useAuth();
  const nowTime = useNow();

  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<TDeck | null>(null);
  const [deckToRename, setDeckToRename] = useState<TDeck | null>(null);

  const { data: decks = [], isPending: isPendingDecks } = useDecks();
  const { data: cards = [], isPending: isPendingCards } = useCards();
  const { data: todayReviewLogs = [] } = useTodayReviewLogs();
  const { data: profiles = [] } = useLearningProfiles();
  const defaultProfile = profiles.find((p) => p.is_default) ?? null;

  const isPending = isPendingDecks || isPendingCards;

  const getDeckStats = (deckId: string) => {
    const deckCards = cards.filter((c) => c.deck_id === deckId);
    const deck = decks.find((d) => d.id === deckId);
    const profile =
      profiles.find((p) => p.id === deck?.learning_profile_id) ??
      defaultProfile;
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

    const newCardsPerDay =
      profile?.new_cards_per_day ?? DEFAULT_NEW_CARDS_PER_DAY;
    const maxReviewsPerDay =
      profile?.max_reviews_per_day ?? DEFAULT_MAX_REVIEWS_PER_DAY;

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

  if (!loading && !user) {
    return <SignInForm />;
  }

  const showPlaceholder = loading || isPending;

  return (
    <div className="min-h-screen relative">
      <Navbar />

      <main className="max-w-5xl mx-auto px-5 pt-5 pb-16 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className={cn(
              "text-2xl font-bold tracking-tight truncate min-w-0",
              showPlaceholder &&
                "text-transparent bg-skeleton animate-pulse rounded w-48 select-none",
            )}
          >
            Decks{" "}
            {!showPlaceholder && (
              <span className="font-normal text-muted-foreground">
                ({decks.length})
              </span>
            )}
          </h2>

          <Dialog
            open={deckToRename !== null}
            onOpenChange={(open) => {
              if (!open) setDeckToRename(null);
            }}
          >
            <DialogContent>
              {deckToRename && (
                <DeckSettingsForm
                  deck={deckToRename}
                  onDone={() => setDeckToRename(null)}
                />
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={deckToDelete !== null}
            onOpenChange={(open) => {
              if (!open) setDeckToDelete(null);
            }}
          >
            <DialogContent>
              {deckToDelete && (
                <DeleteDeckForm
                  deck={deckToDelete}
                  onDone={() => setDeckToDelete(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDeckOpen} onOpenChange={setIsCreateDeckOpen}>
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
              <Plus
                className={cn("size-5 -ml-1.5", showPlaceholder && "opacity-0")}
              />
              Create Deck
            </DialogTrigger>
            <DialogContent>
              {isCreateDeckOpen && (
                <CreateDeckForm
                  onAfterSubmit={async (id) => {
                    await asyncRouterPush(`/deck/${id}`);
                    setIsCreateDeckOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
        <DecksSection
          showPlaceholder={showPlaceholder}
          decks={decks}
          getDeckStats={getDeckStats}
          nowTime={nowTime}
          onCreateDeck={() => setIsCreateDeckOpen(true)}
          onEdit={(deck) => setDeckToRename(deck)}
          onDelete={(deck) => setDeckToDelete(deck)}
        />
        <div className="w-full h-px rounded-full bg-border" />
        <TodayStatsFooter showPlaceholder={showPlaceholder} />
      </main>
    </div>
  );
}

function CreateDeckForm({
  onAfterSubmit,
}: {
  onAfterSubmit: (id: string) => Promise<void>;
}) {
  const { data: profiles, isPending: isPendingProfiles } =
    useLearningProfiles();
  const defaultProfile = profiles?.find((p) => p.is_default);
  const mutation = useCreateDeck();
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      learning_profile_id: defaultProfile?.id ?? "",
    },
    validators: {
      onMount: createDeckSchema,
      onChange: createDeckSchema,
      onSubmit: createDeckSchema,
    },
    onSubmit: async ({ value }) => {
      const id = await mutation.mutateAsync({
        name: value.name,
        description: value.description,
        learning_profile_id: value.learning_profile_id,
      });
      await onAfterSubmit(id);
    },
  });

  useEffect(() => {
    if (defaultProfile && !form.state.values.learning_profile_id) {
      form.setFieldValue("learning_profile_id", defaultProfile.id);
    }
  }, [defaultProfile]);

  const isLoading = isPendingProfiles;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Create Deck</DialogTitle>
        <DialogDescription>
          Organize your cards into decks by topic or subject.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Name</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="e.g. Spanish Vocabulary"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Description (optional)</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="e.g. Words from chapter 1-5"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="learning_profile_id">
          {(field) => {
            const profileOptions = (profiles ?? []).map((p) => ({
              value: p.id,
              label: p.name,
            }));
            const selected =
              profileOptions.find((o) => o.value === field.state.value) ?? null;
            return (
              <div className="space-y-2">
                <Label>Learning Profile</Label>
                {isLoading ? (
                  <div className="h-10 w-full rounded-lg bg-skeleton animate-pulse" />
                ) : (
                  <Combobox
                    items={profileOptions}
                    itemToStringValue={(i) => i.label}
                    value={selected}
                    onValueChange={(val) => {
                      const selectedValue = val;
                      field.handleChange(selectedValue?.value || "");
                    }}
                    onOpenChangeComplete={(open) => {
                      if (open) return;
                      if (
                        field.state.value &&
                        profileOptions.some(
                          (o) => o.value === field.state.value,
                        )
                      ) {
                        return;
                      }
                      if (!defaultProfile) return;
                      field.handleChange(defaultProfile.id);
                    }}
                  >
                    <ComboboxInput
                      placeholder="Search profiles..."
                      className="w-full"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>No profiles found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: (typeof profileOptions)[number]) => (
                          <ComboboxItem key={item.value} value={item}>
                            {item.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
                <p className="text-xs text-muted-foreground">
                  Controls daily limits and learning parameters.
                </p>
              </div>
            );
          }}
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
              disabled={!canSubmit || isLoading}
              isPending={isSubmitting}
            >
              Create Deck
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

function DeckSettingsForm({
  deck,
  onDone,
}: {
  deck: TDeck;
  onDone: () => void;
}) {
  const { data: profiles, isPending: isPendingProfiles } =
    useLearningProfiles();
  const mutation = useUpdateDeck();
  const form = useForm({
    defaultValues: {
      name: deck.name,
      description: deck.description ?? "",
      learning_profile_id: deck.learning_profile_id,
    },
    validators: {
      onMount: deckSettingsSchema,
      onChange: deckSettingsSchema,
      onSubmit: deckSettingsSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        id: deck.id,
        name: value.name,
        description: value.description,
        learning_profile_id: value.learning_profile_id,
      });
      onDone();
    },
  });

  const isLoading = isPendingProfiles || !profiles;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Update the name, description, or learning profile for this deck.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Name</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Deck Name"
              />
            </div>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Description (optional)</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="e.g. Words from chapter 1-5"
              />
            </div>
          )}
        </form.Field>
        <div className="border-t pt-4 space-y-4">
          <form.Field name="learning_profile_id">
            {(field) => {
              const profileOptions = (profiles ?? []).map((p) => ({
                value: p.id,
                label: p.name,
              }));
              const selected =
                profileOptions.find((o) => o.value === field.state.value) ??
                null;
              const fallbackId =
                profiles?.find((p) => p.is_default)?.id ??
                deck.learning_profile_id;
              return (
                <div className="space-y-2">
                  <Label>Learning Profile</Label>
                  {isLoading ? (
                    <div className="h-8 w-full rounded-lg bg-skeleton animate-pulse" />
                  ) : (
                    <Combobox
                      items={profileOptions}
                      itemToStringValue={(i) => i.label}
                      value={selected}
                      onValueChange={(val) => {
                        field.handleChange(val?.value ?? fallbackId);
                      }}
                      onOpenChange={(open) => {
                        if (!open && !field.state.value) {
                          field.handleChange(fallbackId);
                        }
                      }}
                    >
                      <ComboboxInput
                        placeholder="Search profiles..."
                        className="w-full"
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>No profiles found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: (typeof profileOptions)[number]) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Controls daily limits and learning parameters.
                  </p>
                </div>
              );
            }}
          </form.Field>
        </div>
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
              disabled={!canSubmit || !isDirty || isLoading}
              isPending={isSubmitting}
            >
              Save
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

function DeleteDeckForm({ deck, onDone }: { deck: TDeck; onDone: () => void }) {
  const mutation = useDeleteDeck();
  const form = useForm({
    defaultValues: { confirmation: "" },
    validators: {
      onMount: deleteDeckSchema,
      onChange: deleteDeckSchema,
      onSubmit: deleteDeckSchema,
    },
    onSubmit: async () => {
      await mutation.mutateAsync({ id: deck.id });
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
        <DialogTitle>Delete Deck</DialogTitle>
        <DialogDescription>
          This action cannot be undone. This will permanently delete the deck
          &quot;{deck.name}&quot; and all its cards.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-2">
            Please type{" "}
            <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-mono font-medium">
              {DELETE_DECK_CONFIRMATION}
            </span>{" "}
            to confirm.
          </p>
          <form.Field name="confirmation">
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={DELETE_DECK_CONFIRMATION}
              />
            )}
          </form.Field>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <form.Subscribe
          selector={(s) => ({
            canSubmit: s.canSubmit,
            isSubmitting: s.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              type="submit"
              variant="destructive"
              disabled={!canSubmit}
              isPending={isSubmitting}
            >
              Delete
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

function TodayStatsFooter({ showPlaceholder }: { showPlaceholder: boolean }) {
  const { data, isPending } = useTodayStats();
  const humanDuration = formatHumanDuration(data.totalMs);
  const secondsPerCard = formatSecondsPerCard(data.msPerCard);
  const cardWord = data.count === 1 ? "card" : "cards";

  const statsText =
    showPlaceholder || isPending ? (
      "Loading today's stats..."
    ) : data.count === 0 ? (
      "You haven't studied today."
    ) : (
      <>
        You've studied{" "}
        <span className="text-foreground">
          {data.count} {cardWord}
        </span>{" "}
        in <span className="text-foreground">{humanDuration}</span> today (
        <span className="text-foreground">{secondsPerCard}s/card</span>)
      </>
    );

  return (
    <div
      data-placeholder={showPlaceholder ? "true" : undefined}
      className="w-full flex justify-center group"
    >
      <p className="text-center text-sm max-w-2xl text-muted-foreground group-data-placeholder:bg-skeleton group-data-placeholder:text-transparent group-data-placeholder:animate-skeleton group-data-placeholder:rounded">
        {statsText}
      </p>
    </div>
  );
}

function formatHumanDuration(totalMs: number): string {
  const duration = intervalToDuration({ start: 0, end: Math.round(totalMs) });
  const formatted = formatDuration(duration, {
    format: ["hours", "minutes", "seconds"],
    delimiter: ", ",
  });
  return formatted || "less than a second";
}

function formatSecondsPerCard(msPerCard: number): string {
  const seconds = msPerCard / 1000;
  const rounded = Math.round(seconds * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

type TDeckStats = {
  total: number;
  new: number;
  learn: number;
  due: number;
  latestCardCreatedAt: number;
};

function DecksSection({
  showPlaceholder,
  decks,
  getDeckStats,
  nowTime,
  onCreateDeck,
  onEdit,
  onDelete,
}: {
  showPlaceholder: boolean;
  decks: TDeck[];
  getDeckStats: (deckId: string) => TDeckStats;
  nowTime: number;
  onCreateDeck: () => void;
  onEdit: (deck: TDeck) => void;
  onDelete: (deck: TDeck) => void;
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
          Create your first deck to start adding cards.
        </p>
        <Button onClick={onCreateDeck}>
          <Plus className="size-5 -ml-1.5" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
      {children}
    </div>
  );
}
