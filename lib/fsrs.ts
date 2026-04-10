import { TUserSettings } from "@/lib/db/schema";
import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
  type Card as FSRSCard,
  type Grade,
  type FSRS,
  type ReviewLog as FSRSReviewLog,
  type StepUnit,
  type FSRSParameters,
} from "ts-fsrs";

export { Rating, State, createEmptyCard };
export type { FSRSCard, Grade, FSRS, FSRSParameters };

export const FSRS_DEFAULT_REQUEST_RETENTION = 0.9;
export const FSRS_DEFAULT_MAXIMUM_INTERVAL = 36500;
export const FSRS_DEFAULT_ENABLE_FUZZ = false;
export const FSRS_DEFAULT_ENABLE_SHORT_TERM = true;
export const FSRS_DEFAULT_LEARNING_STEPS: readonly StepUnit[] = Object.freeze([
  "1m",
  "10m",
]); // New->Learning,Learning->Learning

export const FSRS_DEFAULT_RELEARNING_STEPS: readonly StepUnit[] = Object.freeze(
  ["10m"],
); // Relearning->Relearning

export const FSRS_DEFAULT_DECAY = 0.1542;

export const FSRS_DEFAULT_W = Object.freeze([
  0.212,
  1.2931,
  2.3065,
  8.2956,
  6.4133,
  0.8334,
  3.0194,
  0.001,
  1.8722,
  0.1666,
  0.796,
  1.4835,
  0.0614,
  0.2629,
  1.6483,
  0.6014,
  1.8729,
  0.5425,
  0.0912,
  0.0658,
  FSRS_DEFAULT_DECAY,
]);

export function createUserScheduler(params: TUserSettings): FSRS {
  const fsrsParams: FSRSParameters = {
    request_retention: params.requestRetention,
    maximum_interval: params.maximumInterval,
    enable_fuzz: params.enableFuzz,
    enable_short_term: params.enableShortTerm,
    learning_steps: params.learningSteps as StepUnit[],
    relearning_steps: params.relearningSteps as StepUnit[],
    w: params.w,
  };
  return fsrs(fsrsParams);
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
