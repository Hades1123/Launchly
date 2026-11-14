# Quickstart: validate language support

Prerequisites: `pn db:up && pn db:migrate && pn db:seed`, no dev server on :3100/:4100.

1. `pn --filter @launchly/web test`: the catalogue parity and error-mapping unit tests pass.
2. `pn --filter @launchly/web test:e2e -- scrum-91`: the language-switch specs pass.
3. Manual check with `pn dev`:
   - Open http://localhost:3000 in a private window: `<html lang="vi">`, and the switcher shows "Tiếng Việt".
   - Choose English: the page stays on the same URL and `<html lang="en">`. Reload: still English. Open `/jobs`: still English.
   - Open `/login` and sign in with a wrong password: the error is in English. Switch to Tiếng Việt and retry: Vietnamese.
   - Open a job detail page: the posted date changes format when switching language.
   - Sign in as a recruiter and as an admin: the switcher is in the recruiter workspace (desktop and mobile) and in the admin header.
