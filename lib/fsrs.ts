import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
  type Card as FSRSCard,
  type Grade,
  type FSRS,
  type ReviewLog as FSRSReviewLog,
} from "ts-fsrs";

export { Rating, State, createEmptyCard };
export type { FSRSCard, Grade, FSRS };

export const scheduler = fsrs();

export function createUserScheduler(
  settings: {
    request_retention?: number;
    maximum_interval?: number;
    w?: number[] | null;
    enable_fuzz?: boolean;
    enable_short_term?: boolean;
  } | null,
): FSRS {
  if (!settings) return fsrs();
  return fsrs({
    request_retention: settings.request_retention ?? 0.9,
    maximum_interval: settings.maximum_interval ?? 36500,
    w: settings.w ?? undefined,
    enable_fuzz: settings.enable_fuzz ?? true,
    enable_short_term: settings.enable_short_term ?? true,
  });
}

export function reviewLogToDbRow(
  log: FSRSReviewLog,
  cardId: string,
  durationMs: number,
) {
  return {
    card_id: cardId,
    rating: log.rating as number,
    state: stateToEnum[log.state] ?? "new",
    due: new Date(log.due).toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    scheduled_days: log.scheduled_days,
    learning_steps: log.learning_steps,
    review: new Date(log.review).toISOString(),
    duration_ms: durationMs,
  };
}

const stateToEnum: Record<State, string> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const enumToState: Record<string, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

export function dbRowToFSRSCard(row: {
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
}): FSRSCard {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: enumToState[row.state] ?? State.New,
    learning_steps: row.learning_steps,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function fsrsCardToDbRow(card: FSRSCard) {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: stateToEnum[card.state] ?? "new",
    learning_steps: card.learning_steps,
    last_review: card.last_review
      ? new Date(card.last_review).toISOString()
      : null,
  };
}

/** Cards due within this window are re-queued in the same study session. */
export const SHORT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function formatInterval(dueDate: Date, now: Date): string {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1.1) return "< 1m | This session";
  if (diffMinutes < 60) return `< ${diffMinutes}m | This session`;

  const diffHours = Math.round(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays < 31) return `${diffDays}d`;

  const diffMonths = +(diffDays / 30.44).toFixed(1);
  return `${diffMonths}mo`;
}
