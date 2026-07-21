# Animation Plans — EduStream

## Execution order

| # | Plan | Severity | Effort | Depends on | Status |
|---|------|----------|--------|------------|--------|
| 001 | Press feedback scale on all buttons | HIGH | ~30min | — | DONE |
| 002 | Skeleton loader easing curve | HIGH | ~5min | — | DONE |
| 003 | Fade-in entrance for cards & lists | MEDIUM | ~20min | — | DONE |

## Dependencies

- All three plans are independent — can be executed in any order
- Recommended order: **002** (fastest win) → **001** (highest impact) → **003** (polish)

## How to execute

```powershell
# Pick a plan and run it:
improve-animations execute plans/001-press-feedback-scale.md
# Or execute manually with any agent:
# 1. Read the plan
# 2. Apply the code changes
# 3. Run npx tsc --noEmit
# 4. Feel-check in the app
```
