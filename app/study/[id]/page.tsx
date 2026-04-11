"use client";

import { useAuth } from "@/components/auth-provider";
import { NCardStudy } from "@/components/n-card-study";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useDeck } from "@/hooks/data/use-decks";
import { useLearningProfiles } from "@/hooks/data/use-learning-profiles";
import { useRateCard } from "@/hooks/data/use-rate-card";
import { useStudyCards, type TStudyCard } from "@/hooks/data/use-study-cards";
import { useReviewTimer } from "@/hooks/use-review-timer";
import {
  createUserScheduler,
  dbRowToFSRSCard,
  formatInterval,
  Rating,
  SHORT_INTERVAL_MS,
  type Grade,
} from "@/lib/fsrs";
import confetti from "canvas-confetti";
import { BrushCleaningIcon, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useMemo, useState } from "react";

type TQueueItem = {
  card: TStudyCard;
  isRequeued: boolean;
  dueTime: number;
};

export default function StudyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();

  const [queue, setQueue] = useState<TQueueItem[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);

  const { data: profiles = [], isPending: isPendingProfiles } =
    useLearningProfiles();

  const { data: deckData, isPending: isPendingDecks } = useDeck(id);

  const learningProfile =
    profiles.find((p) => p.id === deckData?.learning_profile_id) ??
    profiles.find((p) => p.is_default) ??
    null;

  const userScheduler = useMemo(() => {
    if (!learningProfile) return null;
    return createUserScheduler(learningProfile);
  }, [learningProfile]);

  // Redirect home if the deck doesn't exist.
  useEffect(() => {
    if (!isPendingDecks && user && id && deckData === null) {
      router.push("/");
    }
  }, [isPendingDecks, deckData, user, id, router]);

  const deckName = deckData?.name ?? "Loading...";

  const { data: studyData, isPending: isPendingCards } = useStudyCards(
    id,
    learningProfile,
  );

  const isPending = isPendingDecks || isPendingCards || isPendingProfiles;
  const totalCards = studyData?.totalCards || 0;

  // Initialize queue from fetched data
  useEffect(() => {
    if (studyData?.dueCards.length) {
      setQueue(
        studyData.dueCards.map((card) => ({
          card,
          isRequeued: false,
          dueTime: new Date(card.due).getTime(),
        })),
      );
      setReviewedCount(0);
    }
  }, [studyData]);

  const rateCardMutation = useRateCard(userScheduler, id);

  const currentCard = queue[0]?.card ?? null;
  const { getElapsedMs } = useReviewTimer(currentCard?.id ?? null);
  const isFinished = queue.length === 0 && reviewedCount > 0;
  const hasNoDueCards =
    !isPending &&
    studyData &&
    studyData.dueCards.length === 0 &&
    totalCards > 0;

  const handleRate = (rating: Grade) => {
    if (!user || !currentCard) return;
    const durationMs = getElapsedMs();
    rateCardMutation.mutate(
      { rating, currentCard, durationMs },
      {
        onSuccess: ({ result, dbFields, now }) => {
          const newDueMs = result.card.due.getTime();
          const intervalMs = newDueMs - now.getTime();

          setQueue((prev) => {
            const [current, ...rest] = prev;
            if (!current) return prev;

            if (intervalMs < SHORT_INTERVAL_MS) {
              const updatedCard: TStudyCard = {
                ...current.card,
                ...dbFields,
              };
              const requeued: TQueueItem = {
                card: updatedCard,
                isRequeued: true,
                dueTime: newDueMs,
              };
              const firstPass = rest.filter((item) => !item.isRequeued);
              const requeuedItems = [
                ...rest.filter((item) => item.isRequeued),
                requeued,
              ].sort((a, b) => a.dueTime - b.dueTime);
              return [...firstPass, ...requeuedItems];
            }

            return rest;
          });

          setReviewedCount((prev) => prev + 1);
        },
      },
    );
  };

  const previewLabels =
    currentCard && userScheduler
      ? (() => {
          const fsrsCard = dbRowToFSRSCard(currentCard);
          const now = new Date();
          const preview = userScheduler.repeat(fsrsCard, now);
          return {
            againLabel: formatInterval(preview[Rating.Again].card.due, now),
            hardLabel: formatInterval(preview[Rating.Hard].card.due, now),
            goodLabel: formatInterval(preview[Rating.Good].card.due, now),
            easyLabel: formatInterval(preview[Rating.Easy].card.due, now),
          };
        })()
      : null;

  useEffect(() => {
    if (isFinished) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isFinished]);

  if (!loading && !user) return null;

  const hasNoCards = !isPending && studyData && totalCards === 0;
  const showPlaceholder =
    loading ||
    isPending ||
    !deckData ||
    (!currentCard && !isFinished && !hasNoDueCards && !hasNoCards);

  return (
    <div className="h-svh overflow-hidden flex flex-col">
      <Navbar
        backHref="/"
        title={
          showPlaceholder ? (
            <div className="h-5 w-36 bg-skeleton animate-pulse rounded" />
          ) : (
            deckName
          )
        }
        rightActions={
          showPlaceholder ? (
            <div className="text-sm font-medium text-transparent bg-skeleton animate-pulse rounded w-12">
              &nbsp;
            </div>
          ) : (
            !isFinished &&
            queue.length > 0 && (
              <div className="text-sm font-medium text-muted-foreground">
                {reviewedCount + 1} / {reviewedCount + queue.length}
              </div>
            )
          )
        }
      />

      <main className="flex-1 flex flex-col items-center justify-center p-5 max-w-4xl mx-auto w-full overflow-hidden">
        {showPlaceholder ? (
          <NCardStudy isPlaceholder />
        ) : totalCards === 0 && !hasNoDueCards ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-border text-foreground mb-4">
              <BrushCleaningIcon className="w-10 h-10" />
            </div>
            <div className="max-w-full flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-foreground">
                This deck is empty
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                Add some cards to this deck to study it.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Link href={`/deck/${id}`}>
                <Button>Add Cards</Button>
              </Link>
            </div>
          </div>
        ) : isFinished || hasNoDueCards ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-muted text-success mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="max-w-full flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-foreground">
                You're all caught up!
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                You have reviewed all the due cards in this deck. Great job!
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Link href="/">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href={`/deck/${id}`}>
                <Button>Manage Deck</Button>
              </Link>
            </div>
          </div>
        ) : (
          <NCardStudy
            key={`${currentCard.id}-${reviewedCount}`}
            front={currentCard.front}
            back={currentCard.back}
            onRate={handleRate}
            ratingPending={rateCardMutation.isPending}
            pendingRating={rateCardMutation.variables?.rating ?? null}
            againLabel={previewLabels!.againLabel}
            hardLabel={previewLabels!.hardLabel}
            goodLabel={previewLabels!.goodLabel}
            easyLabel={previewLabels!.easyLabel}
          />
        )}
      </main>
    </div>
  );
}
