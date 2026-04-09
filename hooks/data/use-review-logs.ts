"use client";

import { useAuth } from "@/components/auth-provider";
import { handleDbError, OperationType } from "@/lib/db-error";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface TodayReviewLog {
  card_id: string;
  state: string;
}

export const todayReviewLogsKey = (userId: string | undefined) =>
  ["todayReviewLogs", userId] as const;

export function useTodayReviewLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: todayReviewLogsKey(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("review_logs")
        .select("card_id, state")
        .gte("review", startOfDay.toISOString());
      if (error) await handleDbError(error, OperationType.GET, "review_logs");
      return (data ?? []) as TodayReviewLog[];
    },
    enabled: !!user,
  });
}
