CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"teacher_id" integer,
	"is_chat_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer,
	"for_date" date,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"instructions" text,
	"link_url" text,
	"points_reward" integer DEFAULT 20 NOT NULL,
	"submission_type" text DEFAULT 'text' NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp DEFAULT now() + interval '24 hours' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_challenge_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"challenge_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submission_text" text,
	"submission_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"teacher_feedback" text,
	"reviewed_at" timestamp,
	"points_awarded" integer,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_challenge_completions_student_id_challenge_id_unique" UNIQUE("student_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'student' NOT NULL,
	"name_confirmed" boolean DEFAULT false NOT NULL,
	"class_id" integer,
	"points" integer DEFAULT 0 NOT NULL,
	"avatar_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "students_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "game_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"item_order" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"class_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'match-sentence-picture' NOT NULL,
	"description" text,
	"image_url" text,
	"points_reward" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "student_game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"mistakes" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_game_sessions_student_id_game_id_version_unique" UNIQUE("student_id","game_id","version")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_mutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"muted_until" timestamp,
	"reason" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_mutes_class_id_student_id_unique" UNIQUE("class_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "ai_story_daily_allowances" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"for_date" date DEFAULT now() NOT NULL,
	"extra_uses" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_story_daily_allowances_student_id_for_date_unique" UNIQUE("student_id","for_date")
);
--> statement-breakpoint
CREATE TABLE "ai_story_quiz_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"points_awarded" integer,
	"teacher_feedback" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_story_quiz_submissions_student_id_session_id_unique" UNIQUE("student_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "ai_story_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"story_type" text NOT NULL,
	"student_name" text NOT NULL,
	"title" text NOT NULL,
	"story" text NOT NULL,
	"generated_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"for_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"addressee_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_requester_id_addressee_id_unique" UNIQUE("requester_id","addressee_id")
);
--> statement-breakpoint
CREATE TABLE "library_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"selected_answer" text,
	"text_answer" text,
	"is_correct" boolean,
	"points_awarded" integer DEFAULT 0,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_object_path" text,
	"content_object_path" text,
	"body_text" text,
	"external_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_item_id" integer NOT NULL,
	"type" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_answer" text,
	"points" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_item_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"teacher_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_submissions_library_item_id_student_id_unique" UNIQUE("library_item_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_students_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_teacher_id_students_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_challenge_completions" ADD CONSTRAINT "student_challenge_completions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_challenge_completions" ADD CONSTRAINT "student_challenge_completions_challenge_id_daily_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."daily_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_items" ADD CONSTRAINT "game_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_game_sessions" ADD CONSTRAINT "student_game_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_game_sessions" ADD CONSTRAINT "student_game_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_students_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_created_by_students_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_story_daily_allowances" ADD CONSTRAINT "ai_story_daily_allowances_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_story_quiz_submissions" ADD CONSTRAINT "ai_story_quiz_submissions_session_id_ai_story_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_story_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_story_quiz_submissions" ADD CONSTRAINT "ai_story_quiz_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_story_quiz_submissions" ADD CONSTRAINT "ai_story_quiz_submissions_reviewed_by_students_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_story_sessions" ADD CONSTRAINT "ai_story_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_students_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_students_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_answers" ADD CONSTRAINT "library_answers_submission_id_library_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."library_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_answers" ADD CONSTRAINT "library_answers_question_id_library_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."library_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_teacher_id_students_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_questions" ADD CONSTRAINT "library_questions_library_item_id_library_items_id_fk" FOREIGN KEY ("library_item_id") REFERENCES "public"."library_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_submissions" ADD CONSTRAINT "library_submissions_library_item_id_library_items_id_fk" FOREIGN KEY ("library_item_id") REFERENCES "public"."library_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_submissions" ADD CONSTRAINT "library_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_student_id_created_at_index" ON "activity_logs" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "friendships_addressee_id_status_index" ON "friendships" USING btree ("addressee_id","status");