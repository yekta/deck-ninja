import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  real,
  integer,
  boolean,
  index,
  pgSchema,
} from "drizzle-orm/pg-core";

export const cardStateEnum = pgEnum("card_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const decks = pgTable(
  "decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("decks_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    due: timestamp("due", { withTimezone: true }).notNull().defaultNow(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: cardStateEnum("state").notNull().default("new"),
    learningSteps: integer("learning_steps").notNull().default(0),
    lastReview: timestamp("last_review", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cards_deck_id_user_id_due_idx").on(
      t.deckId,
      t.userId,
      t.due,
    ),
  ],
);

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  requestRetention: real("request_retention").notNull().default(0.9),
  maximumInterval: integer("maximum_interval").notNull().default(36500),
  w: real("w").array(),
  enableFuzz: boolean("enable_fuzz").notNull().default(true),
  enableShortTerm: boolean("enable_short_term").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    state: cardStateEnum("state").notNull(),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    review: timestamp("review", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("review_logs_card_id_review_idx").on(t.cardId, t.review)],
);

export type Deck = typeof decks.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type ReviewLog = typeof reviewLogs.$inferSelect;
