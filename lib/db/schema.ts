import {
  DEFAULT_MAX_REVIEWS_PER_DAY,
  DEFAULT_NEW_CARDS_PER_DAY,
} from "@/lib/constants";
import {
  FSRS_DEFAULT_ENABLE_FUZZ,
  FSRS_DEFAULT_ENABLE_SHORT_TERM,
  FSRS_DEFAULT_LEARNING_STEPS,
  FSRS_DEFAULT_MAXIMUM_INTERVAL,
  FSRS_DEFAULT_RELEARNING_STEPS,
  FSRS_DEFAULT_REQUEST_RETENTION,
  FSRS_DEFAULT_W,
} from "@/lib/fsrs";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgSchema,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const cardStateEnumConst = ["new", "learning", "review", "relearning"] as const;
export const cardStateEnum = pgEnum("card_state", cardStateEnumConst);

const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const learningProfiles = pgTable(
  "learning_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    is_default: boolean("is_default").notNull().default(false),
    new_cards_per_day: integer("new_cards_per_day")
      .notNull()
      .default(DEFAULT_NEW_CARDS_PER_DAY),
    max_reviews_per_day: integer("max_reviews_per_day")
      .notNull()
      .default(DEFAULT_MAX_REVIEWS_PER_DAY),
    request_retention: real("request_retention")
      .notNull()
      .default(FSRS_DEFAULT_REQUEST_RETENTION),
    maximum_interval: integer("maximum_interval")
      .notNull()
      .default(FSRS_DEFAULT_MAXIMUM_INTERVAL),
    w: real("w")
      .array()
      .notNull()
      .default(FSRS_DEFAULT_W as number[]),
    enable_fuzz: boolean("enable_fuzz")
      .notNull()
      .default(FSRS_DEFAULT_ENABLE_FUZZ),
    enable_short_term: boolean("enable_short_term")
      .notNull()
      .default(FSRS_DEFAULT_ENABLE_SHORT_TERM),
    learning_steps: text("learning_steps")
      .array()
      .notNull()
      .default(FSRS_DEFAULT_LEARNING_STEPS as string[]),
    relearning_steps: text("relearning_steps")
      .array()
      .notNull()
      .default(FSRS_DEFAULT_RELEARNING_STEPS as string[]),
    last_calibrated_at: timestamp("last_calibrated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("learning_profiles_user_id_is_default_idx").on(
      t.user_id,
      t.is_default,
    ),
  ],
);

export const decks = pgTable(
  "decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    learning_profile_id: uuid("learning_profile_id")
      .notNull()
      .references(() => learningProfiles.id, { onDelete: "restrict" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("decks_user_id_created_at_idx").on(t.user_id, t.created_at)],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deck_id: uuid("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    due: timestamp("due", { withTimezone: true }).notNull().defaultNow(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    elapsed_days: integer("elapsed_days").notNull().default(0),
    scheduled_days: integer("scheduled_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: cardStateEnum("state").notNull().default("new"),
    learning_steps: integer("learning_steps").notNull().default(0),
    last_review: timestamp("last_review", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cards_deck_id_user_id_due_idx").on(t.deck_id, t.user_id, t.due),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    card_id: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    state: cardStateEnum("state").notNull(),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    scheduled_days: integer("scheduled_days").notNull(),
    learning_steps: integer("learning_steps").notNull(),
    review: timestamp("review", { withTimezone: true }).notNull(),
    duration_ms: integer("duration_ms").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("review_logs_card_id_review_idx").on(t.card_id, t.review)],
);

export type TDeck = typeof decks.$inferSelect;
export type TCard = typeof cards.$inferSelect;
export type TLearningProfile = typeof learningProfiles.$inferSelect;
export type TReviewLog = typeof reviewLogs.$inferSelect;

export type TLearningProfileLoose = Omit<
  TLearningProfile,
  "created_at" | "updated_at" | "last_calibrated_at"
> & {
  created_at: string;
  updated_at: string;
  last_calibrated_at: string;
};

export type TCardStateEnum = (typeof cardStateEnumConst)[number];
