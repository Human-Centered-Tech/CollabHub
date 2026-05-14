# CollabHub

AI-generated pull request summaries for engineering teams. Connect a GitHub repo, and every time a PR is opened or updated CollabHub posts a summary covering:

- What the author changed (in plain language)
- Design pros and cons
- Things reviewers should be mindful of

## Stack

- **Backend**: NestJS, TypeORM, PostgreSQL, JWT auth
- **Frontend**: React + TypeScript (Vite), Tailwind
- **LLM**: Anthropic Claude (`claude-sonnet-4-6` by default)
- **GitHub**: GitHub App with per-repo install (Vercel/Railway style)
- **Deploy**: Railway (managed Postgres + two services)

## Local development

```bash
# Backend
cd backend
cp .env.example .env  # then fill in values
npm install
npm run start:dev

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

The backend listens on `:3000` and exposes `/api/*`. The frontend dev server proxies `/api` to the backend.

## Required secrets

You'll provide these after deployment:

| Variable | Where it lives | What it is |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | backend | Claude API key (https://console.anthropic.com) |
| `GITHUB_APP_ID` | backend | GitHub App ID (numeric) |
| `GITHUB_APP_CLIENT_ID` | backend | OAuth client ID from your GitHub App |
| `GITHUB_APP_CLIENT_SECRET` | backend | OAuth client secret |
| `GITHUB_APP_WEBHOOK_SECRET` | backend | Random string used to sign webhooks |
| `GITHUB_APP_PRIVATE_KEY` | backend | Contents of the `.pem` file (with `\n` for newlines, or use multiline env) |
| `GITHUB_APP_SLUG` | backend | URL slug, e.g. `collabhub-app` |
| `JWT_SECRET` | backend | Random 32+ byte string (auto-generated on first deploy if unset) |
| `FRONTEND_URL` | backend | Public URL of the frontend (for CORS + GitHub install redirect) |
| `VITE_API_URL` | frontend | Public URL of the backend |

## GitHub App setup

1. Go to https://github.com/settings/apps/new
2. Set **Homepage URL** = your frontend URL
3. Set **Callback URL** = `{FRONTEND_URL}/github/callback`
4. Set **Webhook URL** = `{BACKEND_URL}/api/webhooks/github`
5. Set **Webhook secret** = the value you used for `GITHUB_APP_WEBHOOK_SECRET`
6. Permissions: **Repository → Pull requests: Read & write**, **Contents: Read**, **Metadata: Read**
7. Subscribe to events: **Pull request**
8. Generate a private key, download it, paste the contents into `GITHUB_APP_PRIVATE_KEY`
9. Install the app on the repos you want CollabHub to summarize

## How it works

1. User signs up with email/password (bcrypt + JWT).
2. User clicks "Connect GitHub" → installs the GitHub App on chosen repos.
3. Install redirect hits backend, which stores the `installation_id` against the user.
4. Backend pulls accessible repos via the installation token.
5. When a PR is opened/synchronized, GitHub fires a webhook → backend verifies HMAC → fetches the diff → calls Claude → persists a `Summary` row.
6. The dashboard polls (or you can wire SSE) and renders summaries per repo.
