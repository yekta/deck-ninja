-- Create card_state enum
CREATE TYPE "public"."card_state" AS ENUM('new', 'learning', 'review', 'relearning');

-- Drop old SM2 index
DROP INDEX IF EXISTS "cards_deck_id_user_id_next_review_idx";

-- Drop old SM2 columns
ALTER TABLE "cards" DROP COLUMN IF EXISTS "interval";
ALTER TABLE "cards" DROP COLUMN IF EXISTS "repetition";
ALTER TABLE "cards" DROP COLUMN IF EXISTS "ease_factor";
ALTER TABLE "cards" DROP COLUMN IF EXISTS "next_review_date";

-- Add FSRS columns
ALTER TABLE "cards" ADD COLUMN "due" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "cards" ADD COLUMN "stability" real DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "difficulty" real DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "elapsed_days" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "scheduled_days" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "reps" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "lapses" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "state" "public"."card_state" DEFAULT 'new' NOT NULL;
ALTER TABLE "cards" ADD COLUMN "learning_steps" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cards" ADD COLUMN "last_review" timestamp with time zone;

-- Create new index on due date
CREATE INDEX "cards_deck_id_user_id_due_idx" ON "cards" USING btree ("deck_id", "user_id", "due");
