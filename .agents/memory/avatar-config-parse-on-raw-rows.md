---
name: AvatarConfig parse on raw rows
description: Why raw student rows need their avatarConfig parsed before returning to the frontend.
---

The `studentsTable.avatarConfig` column is JSONB with a database default of `{}`. The app expects a valid `AvatarConfig` object with fields like `gender`, `bgColor`, `accessories`, `pet`, `nickname`, `frame`, and `badges`. The zod schema (`avatarConfigSchema`) fills in defaults when parsing, but raw rows returned directly from `db.query.studentsTable.findMany()` expose the unparsed JSONB.

**Why:** If the raw value is `{}` or a partial object, the frontend will try to read `avatarConfig.gender` and get `undefined`, which can break avatar rendering or type-checking.

**How to apply:** Whenever you return a student row outside of `enrichStudentProfile`, parse `avatarConfig` with `avatarConfigSchema.parse(student.avatarConfig)` before sending it to the client. For example, in `friends.ts` map each returned student to a normalized object with parsed avatarConfig.
