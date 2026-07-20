CREATE INDEX "students_class_id_index" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "ai_story_quiz_submissions_student_id_created_at_index" ON "ai_story_quiz_submissions" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "library_answers_status_index" ON "library_answers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "library_answers_submission_id_index" ON "library_answers" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "library_answers_question_id_index" ON "library_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "library_submissions_student_id_index" ON "library_submissions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "library_submissions_library_item_id_index" ON "library_submissions" USING btree ("library_item_id");