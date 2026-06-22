# Sprint Capacity Collector

This project now uses a **separate backend service** for persistence:

- Frontend: `index.html` (UI design unchanged)
- Backend: root-level Node.js service (Express + MongoDB)

## 1) Local setup (first roadmap step)

### Backend

1. Copy env template:

```bash
cp .env.example .env
```

2. Update `.env` with your Mongo URI.
3. Install deps and run backend:

```bash
npm install
npm start
```

Backend runs on `http://localhost:3000` by default.

### Frontend

Open `index.html` in your browser. It calls the backend API at `http://localhost:3000`.

When deployed, `index.html` calls same-origin APIs (`/api/*`) automatically.

## 2) API endpoints

- Route behavior:
  - `/` serves `index.html`
  - `/api/*` serves backend APIs

- `GET /api/health`
- `GET /api/submissions`
- `GET /api/submissions/:teamKey/:sprintNo`
- `POST /api/submissions/upsert`

## 3) Backend layering and logs

- `server.js`: runtime bootstrap
- `src/app.js`: express app setup
- `src/routes/apiRoutes.js`: route registration
- `src/controllers/submissionController.js`: controller handlers
- `src/services/submissionService.js`: service/data logic
- `src/utils/*`: shared logger and helpers
- `src/middleware/requestLogger.js`: logs every API call
- `src/middleware/correlationId.js`: assigns or propagates correlation IDs

API logs are JSON lines and include `correlationId`, method, path, status, and duration.
Responses include `X-Correlation-Id`, and clients can pass `x-correlation-id`.

## 4) GitHub Actions + Vercel deployment

Workflow: `.github/workflows/deploy-vercel.yml`

Behavior:
- Runs on push to `development`, `staging`, `production`
- Uses branch name as GitHub Environment (`environment: ${{ github.ref_name }}`)
- Creates backend `.env` during CI with:
  - `PORT=3000`
  - `MONGO_URI` from GitHub Environment Variable (`vars.MONGO_URI`) or fallback secret (`secrets.MONGO_URI`)
- Deploys backend from repository root to Vercel

## 5) Secrets to add in GitHub

Add these in each GitHub Environment (for example `development`, `staging`, `production`):

- Variable: `MONGO_URI` (or use secret `MONGO_URI`)
- Secret: `VERCEL_TOKEN`
- Secret: `VERCEL_ORG_ID`
- Secret: `VERCEL_PROJECT_ID`

## 6) Optional test run

```bash
npm test
```

This runs an API smoke test using an in-memory MongoDB instance.



