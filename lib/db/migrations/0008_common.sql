ALTER TABLE "classes" ALTER COLUMN "ai_story_quiz_defaults" SET DEFAULT '{"level":"medium","types":["mcq"],"count":5}'::jsonb;

UPDATE "classes"
SET "ai_story_quiz_defaults" = jsonb_build_object(
  'level', COALESCE("ai_story_quiz_defaults"->>'level', 'medium'),
  'types', COALESCE(jsonb_build_array("ai_story_quiz_defaults"->>'type'), '["mcq"]'::jsonb),
  'count', COALESCE(("ai_story_quiz_defaults"->>'count')::int, 5)
)
WHERE "ai_story_quiz_defaults" ? 'type';
