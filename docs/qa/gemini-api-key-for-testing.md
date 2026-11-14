# Using a Gemini API key to test the AI features

The AI features (CV fit check, interview practice questions, feedback and summary) run on a swappable provider chosen by `AI_DRIVER`:

| `AI_DRIVER` | Needs a key | Output | Use for |
| ----------- | ----------- | ------ | ------- |
| `mock` (default) | no | deterministic placeholders ("mock", score 0) | unit tests, Playwright e2e, CI, UI work |
| `gemini` | yes (`GEMINI_API_KEY`) | real model output, varies per run | manual testing of the real AI behaviour, demos |

The key is read only by the API (`apps/api`). The web app never sees it. Never put it in `apps/web`, in a `NEXT_PUBLIC_*` variable, in a commit, in a PR or in chat.

## 1. Get a key

1. Open Google AI Studio (<https://aistudio.google.com/apikey>) and create an API key for the Gemini API.
2. Use your own key. The free tier is enough for manual testing but has rate limits and may use your quota.
3. Treat it as a secret. If it was ever printed in a log, a terminal recording or a chat, revoke it in AI Studio and create a new one.

## 2. Inject the key (pick one)

### A. `apps/api/.env` (everyday local testing)

`apps/api/.env` is git-ignored. Edit it, then restart the API:

```bash
AI_DRIVER=gemini
GEMINI_API_KEY=<your key>
# AI_MODEL=gemini-3.5-flash-lite   # optional; default shown
```

Switch back by setting `AI_DRIVER=mock` (you can leave the key in place).

### B. One shell session only (nothing written to disk)

```bash
read -rs GEMINI_API_KEY && export GEMINI_API_KEY     # paste the key, nothing is echoed
AI_DRIVER=gemini pnpm dev:api
```

The key disappears when you close the terminal.

### C. A throwaway stack on other ports and another database

Use this to test without touching your dev data or the ports of a running e2e stack (see `docs/qa/manual-e2e-demo-test-plan.md` for seeded accounts):

```bash
cd apps/api
DATABASE_URL=postgresql://<user>:<password>@localhost:5433/launchly_demo \
PORT=4200 CORS_ORIGIN=http://localhost:3200 APP_URL=http://localhost:3200 \
AI_DRIVER=gemini GEMINI_API_KEY=<your key> \
node --import tsx src/server.ts
```

Then start the web app with `API_URL=http://localhost:4200`, for example `API_URL=http://localhost:4200 pnpm --filter @launchly/web exec next dev -p 3200`.

Rules for all options:

- The API fails fast at startup if `AI_DRIVER=gemini` and `GEMINI_API_KEY` is empty ("GEMINI_API_KEY is required when AI_DRIVER=gemini").
- Do not paste the key on a command line you share, and avoid `echo $GEMINI_API_KEY` or printing the whole `.env` (for example `cat apps/api/.env`). To check a value without showing it, run `grep -c '^GEMINI_API_KEY=.' apps/api/.env`.
- Docker: `apps/api/.env.docker` is for the container. Pass the key at run time (`docker run -e GEMINI_API_KEY ...`), do not bake it into the image or the file.

## 3. Verify the key works

```bash
pnpm --filter @launchly/api ai:smoke
```

The script reads `GEMINI_API_KEY` and `AI_MODEL` from the environment or `apps/api/.env`. It checks that the model name exists, that the JSON-schema reply is accepted, and that a bad key or model maps to `AI_UNAVAILABLE`. It never prints the key and it is not part of `pnpm test` or CI.

## 4. Test the AI features by hand

Start the stack with the key, sign in as a seeded candidate (`candidate1@launchly.test`, password in `apps/api/prisma/seed/data.ts`) and follow the AI sections of `docs/qa/manual-e2e-demo-test-plan.md`.

| Feature | Where | What real output looks like |
| ------- | ----- | --------------------------- |
| CV fit check | `/cv-review`, or **Check my CV fit** on a job | Score out of 100, matching points, gaps (required and nice to have), improvement tips, quoted evidence from your CV |
| Practice questions | `/interview-practice`, **Generate questions** | Five questions per interactive round, each with a source label ("From the job description", "From the interview round", "From the requirements") |
| Practice feedback | **Get feedback** after saving five answers | Strengths, things to improve, a comment per answer; **Overall summary** after the last selected round |

Notes:

- **Consent first.** The CV check and interview practice each have their own AI consent box. A fresh database shows both.
- **A CV is required** for the CV check (PDF on `/profile`). The text of the CV and the job description, or your answers, are sent to Google. Use seeded or fake data, never real candidate data.
- **Output varies** on every run. Check that the shape is right and the content is plausible, not exact wording.
- **Rate limit.** Question and feedback generation share one quota per candidate: 10 requests per 60 seconds (default). A burst returns `429 RATE_LIMITED`; wait a minute. `INTERVIEW_AI_RATE_LIMIT` changes it (available once wave 7, PR #35, is merged).
- **Timeout.** The Gemini call times out after 30 seconds and the API answers `AI_UNAVAILABLE` (503); the UI shows the error and nothing is invented.

## 5. Keep automated tests on the mock

- Playwright sets `AI_DRIVER=mock` for the API it starts (`apps/web/playwright.config.ts`), and values set there win over `apps/api/.env`. Leaving `AI_DRIVER=gemini` in your `.env` does not make e2e use Gemini.
- The e2e specs count items and never read generated text, because mock replies are placeholders. They would not be stable against real output.
- CI never has a key. Unit tests inject a fake `fetch` into `GeminiAiProvider`, so no request leaves the process.
- Do not add a CI secret for the key unless the team agrees. If a live check is wanted in CI later, run `ai:smoke` as a separate, manually triggered job.

## 6. Troubleshooting

| Symptom | Likely cause and fix |
| ------- | -------------------- |
| API exits at startup: `GEMINI_API_KEY is required when AI_DRIVER=gemini` | Key missing or empty. Set it (section 2) or use `AI_DRIVER=mock`. |
| Results still say "mock" | The API is still on the mock driver or was not restarted after editing `.env`. |
| `AI_UNAVAILABLE` / 503 right away | Wrong or revoked key, wrong `AI_MODEL`, or no network. Run `ai:smoke`; it names the failing check. |
| `AI_UNAVAILABLE` after about 30 seconds | Gemini is slow or overloaded. Retry. |
| `429 RATE_LIMITED` | The 10 per minute practice quota. Wait 60 seconds. |
| Free-tier quota or 429 from Google | AI Studio quota used up. Wait, or use another key or project. |
| Model not found | Change `AI_MODEL` to a current model name and rerun `ai:smoke`. |
