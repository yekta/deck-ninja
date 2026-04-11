"use client";

import { useAuth } from "@/components/auth-provider";
import { handleDbError, OperationType } from "@/lib/db-error";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

export type TCard = {
  id: string;
  front: string;
  back: string;
};

export type TCardListItem = {
  id: string;
  deck_id: string;
  due: string;
  state: string;
  created_at: string;
};

export const cardsKey = (userId: string | undefined) =>
  ["cards", userId] as const;

export const cardsByDeckKey = (deckId: string, userId: string | undefined) =>
  ["cards", deckId, userId] as const;

/**
 * Invalidate every card-related query. Call after any mutation that touches
 * cards so all three card caches stay coherent:
 *   - all-cards list on the home page
 *   - per-deck cards list on the deck page
 *   - per-deck study queue
 *
 * Pass `deckId` when the mutation is scoped to a single deck so per-deck
 * caches get invalidated too.
 */
export function invalidateCards(
  qc: QueryClient,
  userId: string | undefined,
  deckId?: string,
) {
  qc.invalidateQueries({ queryKey: cardsKey(userId) });
  if (deckId) {
    qc.invalidateQueries({ queryKey: cardsByDeckKey(deckId, userId) });
    // studyCards key includes per-day limits so we match on the prefix.
    qc.invalidateQueries({ queryKey: ["studyCards", deckId, userId] });
  }
}

export function useCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: cardsKey(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("cards").select("*");
      if (error) await handleDbError(error, OperationType.GET, "cards");
      return (data ?? []) as TCardListItem[];
    },
    enabled: !!user,
  });
}

export function useCardsByDeck(deckId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: cardsByDeckKey(deckId ?? "", user?.id),
    queryFn: async () => {
      if (!user || !deckId) return [];
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId);
      if (error) await handleDbError(error, OperationType.GET, "cards");
      return (data ?? []) as TCard[];
    },
    enabled: !!user && !!deckId,
  });
}

export function useCreateCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deckId: string;
      front: string;
      back: string;
    }) => {
      if (!user || !input.front.trim() || !input.back.trim())
        throw new Error("Missing data");
      const { error } = await supabase.from("cards").insert({
        deck_id: input.deckId,
        user_id: user.id,
        front: input.front.trim(),
        back: input.back.trim(),
      });
      if (error) await handleDbError(error, OperationType.CREATE, "cards");
    },
    onSuccess: (_data, variables) => {
      invalidateCards(qc, user?.id, variables.deckId);
    },
  });
}

export function useUpdateCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      deckId: string;
      front: string;
      back: string;
    }) => {
      if (!user || !input.front.trim() || !input.back.trim())
        throw new Error("Missing data");
      const { error } = await supabase
        .from("cards")
        .update({
          front: input.front.trim(),
          back: input.back.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error)
        await handleDbError(error, OperationType.UPDATE, `cards/${input.id}`);
    },
    onSuccess: (_data, variables) => {
      invalidateCards(qc, user?.id, variables.deckId);
    },
  });
}

export function useDeleteCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; deckId: string }) => {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", input.id);
      if (error)
        await handleDbError(error, OperationType.DELETE, `cards/${input.id}`);
    },
    onSuccess: (_data, variables) => {
      invalidateCards(qc, user?.id, variables.deckId);
    },
  });
}
