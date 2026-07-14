ALTER TABLE "reading_coach_attempts" ALTER COLUMN "audio_object_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_coach_attempts" ADD COLUMN "audio_base64" text;