ALTER TABLE "library_questions" ADD COLUMN "level" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
CREATE INDEX "library_questions_library_item_id_index" ON "library_questions" USING btree ("library_item_id");--> statement-breakpoint
CREATE INDEX "library_questions_type_index" ON "library_questions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "library_questions_level_index" ON "library_questions" USING btree ("level");