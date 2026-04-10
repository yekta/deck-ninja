"use client";

import { useAuth } from "@/components/auth-provider";
import { TUserSettings } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import { useQuery } from "@tanstack/react-query";

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
      return (data ?? null) as TUserSettings | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
