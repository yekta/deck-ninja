"use client";

import { useAuth } from "@/components/auth-provider";
import {
  DEFAULT_MAX_REVIEWS_PER_DAY,
  DEFAULT_NEW_CARDS_PER_DAY,
} from "@/lib/constants";
import { handleDbError, OperationType } from "@/lib/db-error";
import { SHORT_INTERVAL_MS } from "@/lib/fsrs";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { DeckSummary } from "./use-decks";

export interface StudyFlashcard {
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

export const studyCardsKey = (
  deckId: string,
  userId: string | undefined,
  newCardsPerDay: number | undefined,
  maxReviewsPerDay: number | undefined,
) =>
  [
    "studyCards",
    deckId,
    userId,
    newCardsPerDay,
    maxReviewsPerDay,
  ] as const;

export function useStudyCards(
  deckId: string | undefined,
  deck: DeckSummary | null | undefined,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: studyCardsKey(
      deckId ?? "",
      user?.id,
      deck?.new_cards_per_day,
      deck?.max_reviews_per_day,
    ),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      if (!user || !deckId) return { totalCards: 0, dueCards: [] };

      const { count, error: countError } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deckId);

      const soonCutoff = new Date(Date.now() + SHORT_INTERVAL_MS).toISOString();
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .lte("due", soonCutoff);

      if (countError)
        await handleDbError(countError, OperationType.GET, "cards");
      if (error) await handleDbError(error, OperationType.GET, "cards");

      const allDueCards = (data ?? []) as StudyFlashcard[];

      // Count today's reviews to enforce daily limits
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const cardIds = allDueCards.map((c) => c.id);
      let newReviewedToday = 0;
      let reviewReviewedToday = 0;

      if (cardIds.length > 0) {
        // Get all card IDs in this deck (not just due ones) for review log counting
        const { data: allDeckCards } = await supabase
          .from("cards")
          .select("id")
          .eq("deck_id", deckId);

        const allDeckCardIds = (allDeckCards ?? []).map(
          (c: { id: string }) => c.id,
        );

        if (allDeckCardIds.length > 0) {
          const { data: todayLogs } = await supabase
            .from("review_logs")
            .select("card_id, state")
            .in("card_id", allDeckCardIds)
            .gte("review", startOfDay.toISOString());

          if (todayLogs) {
            const newCardIds = new Set<string>();
            const reviewCardIds = new Set<string>();
            for (const log of todayLogs) {
              if (log.state === "new") newCardIds.add(log.card_id);
              else if (log.state === "review") reviewCardIds.add(log.card_id);
            }
            newReviewedToday = newCardIds.size;
            reviewReviewedToday = reviewCardIds.size;
          }
        }
      }

      // Partition cards by type
      const newCards = allDueCards.filter((c) => c.state === "new");
      const reviewCards = allDueCards.filter((c) => c.state === "review");
      const learningCards = allDueCards.filter(
        (c) => c.state === "learning" || c.state === "relearning",
      );

      // Apply daily limits
      const newCardsPerDay = deck?.new_cards_per_day ?? DEFAULT_NEW_CARDS_PER_DAY;
      const maxReviewsPerDay =
        deck?.max_reviews_per_day ?? DEFAULT_MAX_REVIEWS_PER_DAY;

      const newLimit = Math.max(0, newCardsPerDay - newReviewedToday);
      const reviewLimit = Math.max(0, maxReviewsPerDay - reviewReviewedToday);

      const limitedNew = newCards.slice(0, newLimit);
      const limitedReview = reviewCards.slice(0, reviewLimit);

      // Learning cards are always shown (not limited)
      const limitedCards = [...limitedNew, ...learningCards, ...limitedReview];
      const shuffled = limitedCards.sort(() => Math.random() - 0.5);

      return { totalCards: count ?? 0, dueCards: shuffled };
    },
    enabled: !!user && !!deckId && !!deck,
  });
}
