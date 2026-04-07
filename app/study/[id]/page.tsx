"use client";

import { useAuth } from "@/components/auth-provider";
import { NCardStudy } from "@/components/n-card-study";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { handleDbError, OperationType } from "@/lib/db-error";
import {
  createUserScheduler,
  dbRowToFSRSCard,
  fsrsCardToDbRow,
  reviewLogToDbRow,
  formatInterval,
  Rating,
  type Grade,
} from "@/lib/fsrs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { BrainCircuit, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: string;
  learning_steps: number;
  last_review: string | null;
}

export default function StudyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: userSettings } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const userScheduler = useMemo(
    () => createUserScheduler(userSettings ?? null),
    [userSettings],
  );

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

  const { data: studyData, isPending: isPendingCards } = useQuery({
    queryKey: ["studyCards", id, user?.id],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      if (!user || !id) return { totalCards: 0, dueCards: [] };

      const { count, error: countError } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", id);

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", id)
        .lte("due", now);

      if (countError)
        await handleDbError(countError, OperationType.GET, "cards");
      if (error) await handleDbError(error, OperationType.GET, "cards");

      const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5);
      return { totalCards: count ?? 0, dueCards: shuffled as Flashcard[] };
    },
    enabled: !!user && !!id,
  });

  const isPending = isPendingDecks || isPendingCards;
  const totalCards = studyData?.totalCards || 0;
  const dueCards = studyData?.dueCards || [];

  const rateCardMutation = useMutation({
    mutationFn: async ({
      rating,
      currentCard,
    }: {
      rating: Grade;
      currentCard: Flashcard;
    }) => {
      const fsrsCard = dbRowToFSRSCard(currentCard);
      const now = new Date();
      const result = userScheduler.next(fsrsCard, now, rating);
      const dbFields = fsrsCardToDbRow(result.card);

      const [cardResult, logResult] = await Promise.all([
        supabase
          .from("cards")
          .update({
            ...dbFields,
            updated_at: now.toISOString(),
          })
          .eq("id", currentCard.id),
        supabase
          .from("review_logs")
          .insert(reviewLogToDbRow(result.log, currentCard.id)),
      ]);
      if (cardResult.error)
        await handleDbError(
          cardResult.error,
          OperationType.UPDATE,
          `cards/${currentCard.id}`,
        );
      if (logResult.error)
        await handleDbError(
          logResult.error,
          OperationType.CREATE,
          "review_logs",
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      setCurrentIndex((prev) => prev + 1);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const handleRate = (rating: Grade) => {
    if (!user) return;
    const currentCard = dueCards[currentIndex];
    rateCardMutation.mutate({ rating, currentCard });
  };

  const isFinished = currentIndex >= dueCards.length;
  const currentCard = dueCards[currentIndex];

  const previewLabels = currentCard
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
    if (isFinished && dueCards.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isFinished, dueCards.length]);

  if (!loading && !user) return null;

  const showPlaceholder = loading || isPending;

  return (
    <div className="h-svh overflow-hidden bg-slate-50 flex flex-col">
      <Navbar
        backHref="/"
        title={
          showPlaceholder ? (
            <div className="h-5 w-36 bg-slate-200 animate-pulse rounded" />
          ) : (
            deckName
          )
        }
        rightActions={
          showPlaceholder ? (
            <div className="text-sm font-medium text-transparent bg-slate-200 animate-pulse rounded w-12">
              &nbsp;
            </div>
          ) : (
            !isFinished &&
            dueCards.length > 0 && (
              <div className="text-sm font-medium text-slate-500">
                {currentIndex + 1} / {dueCards.length}
              </div>
            )
          )
        }
      />

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full overflow-hidden">
        {showPlaceholder ? (
          <NCardStudy isPlaceholder />
        ) : totalCards === 0 ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-4">
              <BrainCircuit className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              This deck is empty
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto">
              You need to add some flashcards to this deck before you can study
              it.
            </p>
            <div className="pt-6 flex gap-4 justify-center">
              <Link href={`/deck/${id}`}>
                <Button>Add Cards</Button>
              </Link>
            </div>
          </div>
        ) : isFinished ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              You&apos;re all caught up!
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto">
              You have reviewed all the due cards in this deck. Great job!
            </p>
            <div className="pt-6 flex gap-4 justify-center">
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
            key={currentCard.id}
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
