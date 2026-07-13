---
name: StudentProfile id omission
description: Generated StudentProfile has no id; how to handle lists of other users.
---

The generated `StudentProfile` schema from OpenAPI does not include `id` by default. It is intended for the current signed-in student's profile, where the ID is implicit. This becomes a problem when you want endpoints that return lists of other students (friends, classmates, leaderboard entries) because the frontend needs a stable key and identifier for actions like sending friend requests.

**Why:** The schema was designed around the `/student/me` response and was not extended for cross-user lists.

**How to apply:**
- If you only need to display other users, define a separate `Friend` schema in the OpenAPI spec with `id`, `name`, `points`, and `avatarConfig`. Use it for `FriendList` and extend it for `Classmate`.
- If you want to add `id` to `StudentProfile`, you must also update `enrichStudentProfile` in `student.ts` and every backend endpoint that returns `StudentProfile` to include the field.
