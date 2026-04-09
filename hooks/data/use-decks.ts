"use client";

import { useAuth } from "@/components/auth-provider";
import { handleDbError, OperationType } from "@/lib/db-error";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateCards } from "./use-cards";

export interface Deck {
  id: string;
  name: string;
  description: string;
  new_cards_per_day: number;
  max_reviews_per_day: number;
  created_at: string;
}

export interface DeckSummary {
  name: string;
  new_cards_per_day: number;
  max_reviews_per_day: number;
}

export const decksKey = (userId: string | undefined) =>
  ["decks", userId] as const;

export const deckKey = (id: string) => ["deck", id] as const;

export function useDecks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: decksKey(user?.id),
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
}

export function useDeck(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: deckKey(id ?? ""),
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("decks")
        .select("name, new_cards_per_day, max_reviews_per_day")
        .eq("id", id)
        .single();
      if (error || !data) return null;
      return data as DeckSummary;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description: string }) => {
      if (!user || !input.name.trim()) throw new Error("Missing data");
      const { data, error } = await supabase
        .from("decks")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          description: input.description.trim(),
        })
        .select("id")
        .single();
      if (error) await handleDbError(error, OperationType.CREATE, "decks");
      return data!.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: decksKey(user?.id) });
    },
  });
}

export function useUpdateDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      description: string;
      new_cards_per_day: number;
      max_reviews_per_day: number;
    }) => {
      if (!user || !input.name.trim())
        throw new Error("Invalid update request");
      const { error } = await supabase
        .from("decks")
        .update({
          name: input.name.trim(),
          description: input.description.trim(),
          new_cards_per_day: input.new_cards_per_day,
          max_reviews_per_day: input.max_reviews_per_day,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error)
        await handleDbError(
          error,
          OperationType.UPDATE,
          `decks/${input.id}`,
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: decksKey(user?.id) });
    },
  });
}

export function useDeleteDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Cards are deleted automatically via ON DELETE CASCADE
      const { error } = await supabase
        .from("decks")
        .delete()
        .eq("id", input.id);
      if (error)
        await handleDbError(
          error,
          OperationType.DELETE,
          `decks/${input.id}`,
        );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: decksKey(user?.id) });
      invalidateCards(qc, user?.id, variables.id);
    },
  });
}
