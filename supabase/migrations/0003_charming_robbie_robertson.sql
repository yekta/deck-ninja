ALTER TABLE "user_settings" ALTER COLUMN "w" SET DEFAULT '{0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542}';--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "w" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "enable_fuzz" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "learning_steps" text[] DEFAULT '{"1m","10m"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "relearning_steps" text[] DEFAULT '{"10m"}' NOT NULL;