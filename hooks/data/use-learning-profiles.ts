"use client";

import { useAuth } from "@/components/auth-provider";
import { handleDbError, OperationType } from "@/lib/db-error";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const supabase = createClient();

export const learningProfilesKey = (userId: string | undefined) =>
  ["learningProfiles", userId] as const;

export function useLearningProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: learningProfilesKey(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("learning_profiles")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      if (error)
        await handleDbError(error, OperationType.GET, "learning_profiles");
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDefaultLearningProfile() {
  const { data: profiles = [], ...rest } = useLearningProfiles();
  const defaultProfile = profiles.find((p) => p.is_default) ?? null;
  return { data: defaultProfile, ...rest };
}

export function useCreateLearningProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      if (!user || !input.name.trim()) throw new Error("Missing data");
      const { data, error } = await supabase
        .from("learning_profiles")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          is_default: false,
        })
        .select("id")
        .single();
      if (error)
        await handleDbError(error, OperationType.CREATE, "learning_profiles");
      return data!.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningProfilesKey(user?.id) });
    },
  });
}

export function useUpdateLearningProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      new_cards_per_day?: number;
      max_reviews_per_day?: number;
      request_retention?: number;
      maximum_interval?: number;
      w?: number[];
      enable_fuzz?: boolean;
      enable_short_term?: boolean;
      learning_steps?: string[];
      relearning_steps?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { id, ...fields } = input;
      if (fields.name !== undefined) fields.name = fields.name.trim();
      const { error } = await supabase
        .from("learning_profiles")
        .update({
          ...fields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error)
        await handleDbError(
          error,
          OperationType.UPDATE,
          `learning_profiles/${id}`,
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningProfilesKey(user?.id) });
    },
  });
}

export function useDeleteLearningProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("learning_profiles")
        .delete()
        .eq("id", input.id);
      if (error)
        await handleDbError(
          error,
          OperationType.DELETE,
          `learning_profiles/${input.id}`,
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learningProfilesKey(user?.id) });
    },
  });
}
