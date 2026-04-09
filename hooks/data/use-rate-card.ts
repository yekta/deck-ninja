"use client";

import { useAuth } from "@/components/auth-provider";
import { handleDbError, OperationType } from "@/lib/db-error";
import {
  dbRowToFSRSCard,
  fsrsCardToDbRow,
  reviewLogToDbRow,
  type FSRS,
  type Grade,
} from "@/lib/fsrs";
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsByDeckKey, cardsKey } from "./use-cards";
import type { StudyFlashcard } from "./use-study-cards";

export interface RateCardVariables {
  rating: Grade;
  currentCard: StudyFlashcard;
  durationMs: number;
}

/**
 * Mutation hook for rating a card during study. Owns the DB writes (card
 * update + review log insert) and cache invalidation. Queue-management side
 * effects should live in the caller via `mutate(vars, { onSuccess })`.
 */
export function useRateCard(scheduler: FSRS, deckId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rating,
      currentCard,
      durationMs,
    }: RateCardVariables) => {
      const fsrsCard = dbRowToFSRSCard(currentCard);
      const now = new Date();
      const result = scheduler.next(fsrsCard, now, rating);
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
          .insert(reviewLogToDbRow(result.log, currentCard.id, durationMs)),
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

      return { result, dbFields, now };
    },
    onSuccess: () => {
      // Don't invalidate studyCards here — the page manages its in-memory
      // queue for the active session and re-fetching would disrupt it.
      qc.invalidateQueries({ queryKey: cardsKey(user?.id) });
      if (deckId) {
        qc.invalidateQueries({ queryKey: cardsByDeckKey(deckId, user?.id) });
      }
    },
  });
}
