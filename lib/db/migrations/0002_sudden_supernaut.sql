CREATE TABLE "reading_coach_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"sentence" text NOT NULL,
	"audio_object_path" text NOT NULL,
	"transcription" text,
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"points_awarded" integer,
	"teacher_feedback" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"for_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reading_coach_attempts_student_id_for_date_unique" UNIQUE("student_id","for_date")
);
--> statement-breakpoint
CREATE TABLE "reading_coach_daily_allowances" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"for_date" date DEFAULT now() NOT NULL,
	"extra_uses" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reading_coach_daily_allowances_student_id_for_date_unique" UNIQUE("student_id","for_date")
);
--> statement-breakpoint
CREATE TABLE "reading_coach_sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"sentence" text NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"for_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reading_coach_attempts" ADD CONSTRAINT "reading_coach_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_coach_attempts" ADD CONSTRAINT "reading_coach_attempts_reviewed_by_students_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_coach_daily_allowances" ADD CONSTRAINT "reading_coach_daily_allowances_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_coach_sentences" ADD CONSTRAINT "reading_coach_sentences_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;