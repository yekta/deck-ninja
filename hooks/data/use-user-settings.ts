"use client";

import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface UserSettingsRow {
  user_id: string;
  request_retention: number;
  maximum_interval: number;
  w: number[] | null;
  enable_fuzz: boolean;
  enable_short_term: boolean;
}

export const userSettingsKey = (userId: string | undefined) =>
  ["userSettings", userId] as const;

export function useUserSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: userSettingsKey(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data ?? null) as UserSettingsRow | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
