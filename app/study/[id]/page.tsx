"use client";

import { useAuth } from "@/components/auth-provider";
import { NCardStudy } from "@/components/n-card-study";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { handleDbError, OperationType } from "@/lib/db-error";
import { calculateSM2 } from "@/lib/sm2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { addDays } from "date-fns";
import { BrainCircuit, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  interval: number;
  repetition: number;
  ease_factor: number;
  next_review_date: string;
}

export default function StudyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);

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
        .lte("next_review_date", now);

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
      quality,
      currentCard,
    }: {
      quality: number;
      currentCard: Flashcard;
    }) => {
      const { interval, repetition, easeFactor } = calculateSM2(
        quality,
        currentCard.repetition,
        currentCard.interval,
        currentCard.ease_factor,
      );

      const nextDate = addDays(new Date(), interval);

      const { error } = await supabase
        .from("cards")
        .update({
          interval,
          repetition,
          ease_factor: easeFactor,
          next_review_date: nextDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentCard.id);
      if (error)
        await handleDbError(
          error,
          OperationType.UPDATE,
          `cards/${currentCard.id}`,
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

  const handleRate = (quality: number) => {
    if (!user) return;
    const currentCard = dueCards[currentIndex];
    rateCardMutation.mutate({ quality, currentCard });
  };

  const isFinished = currentIndex >= dueCards.length;
  const currentCard = dueCards[currentIndex];

  const previewIntervals = currentCard
    ? {
        again: calculateSM2(
          1,
          currentCard.repetition,
          currentCard.interval,
          currentCard.ease_factor,
        ).interval,
        hard: calculateSM2(
          3,
          currentCard.repetition,
          currentCard.interval,
          currentCard.ease_factor,
        ).interval,
        good: calculateSM2(
          4,
          currentCard.repetition,
          currentCard.interval,
          currentCard.ease_factor,
        ).interval,
        easy: calculateSM2(
          5,
          currentCard.repetition,
          currentCard.interval,
          currentCard.ease_factor,
        ).interval,
      }
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
            pendingQuality={
              (rateCardMutation.variables?.quality as
                | 1
                | 3
                | 4
                | 5
                | undefined) ?? null
            }
            hardLabel={`${previewIntervals!.hard}d`}
            goodLabel={`${previewIntervals!.good}d`}
            easyLabel={`${previewIntervals!.easy}d`}
          />
        )}
      </main>
    </div>
  );
}
