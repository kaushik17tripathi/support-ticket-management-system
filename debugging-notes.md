## Issue — Unexpected AI-assistant scaffolding folders
### Problem
After `npm install prisma` / `npx prisma init`, three unexpected folders appeared:
backend/.claude/skills, backend/.agents/skills, backend/.windsurf/skills — not requested,
not part of any prompt I ran.
### How I Investigated
Checked package.json for unexpected dependencies (none found — only prisma, express,
zod, and matching dev dependencies). Checked git log for when they appeared (same
commit as initial backend bootstrap). Inspected folder contents to confirm they were
static reference docs, not executable code.
### How AI Helped
N/A — this was Prisma's own tooling (v7), not something I asked Cursor to generate.
### What I Validated
Confirmed contents were inert documentation, not a security or dependency risk, before
deleting.
### Final Fix
Removed the three folders and added a gitignore rule to prevent recreation on future
prisma commands.# Debugging Notes
