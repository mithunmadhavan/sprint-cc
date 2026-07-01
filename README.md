# Sprint Planner

This repository now runs exclusively with microservices under `src/apps`.

## Architecture

- `src/apps/ey-sprint-business-services` - NestJS backend API
- `src/apps/ey-sprint-frontend` - frontend static service

Legacy root runtime files were removed as part of migration.

## Local Development

Install dependencies:

```bash
npm --prefix src/apps/ey-sprint-business-services install
npm --prefix src/apps/ey-sprint-frontend install
```

Run backend:

```bash
npm run dev:backend:new
```

Run frontend (new terminal):

```bash
npm run dev:frontend:new
```

Default URLs:

- Backend API (local dev direct): `http://localhost:3000/api`
- Frontend (local dev): `http://localhost:3001`

## Testing

Unit tests:

```bash
npm run test
```

E2E tests:

```bash
npm run test:e2e:new
```

## Docker

Start stack:

```bash
npm run docker:up
```

Tail logs:

```bash
npm run docker:logs
```

Stop stack:

```bash
npm run docker:down
```

Docker service URLs (single exposed port via NGINX gateway):

- Frontend: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- MongoDB host access: `mongodb://localhost:27018`

Gateway routing:

- `/` -> frontend service (`ey-sprint-frontend:3001`)
- `/api/*` -> backend service (`ey-sprint-business-services:3000`)

Note: in Docker, backend listens on container port `3000` internally and is reached through the frontend proxy (`/api`) instead of direct host exposure.

## Auth Defaults (for local/test bootstrap)

- Email: `mithunpramilak@etihad.ae`
- Password: `Admin@1234`

## Environment Variables

Backend (`src/apps/ey-sprint-business-services`) uses:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (default `12h`)
- `AUTH_STRICT_MODE` (default `true`)

## Makefile Shortcuts

```bash
make help
make test
make test-e2e
make docker-up
make docker-ps
make ports
make health
make docker-down
```

## Vercel + GitHub Actions Deployment

Frontend deployment is configured via:

- `vercel.json` (entry: `src/apps/ey-sprint-frontend/server.js`)
- `.github/workflows/deploy-vercel.yml`

Workflow behavior:

- Triggers on `development`, `staging`, `stage`, `production`
- Builds/deploys Vercel project selected by `VERCEL_PROJECT_ID`
- Syncs `BACKEND_URL` into Vercel env before build/deploy
- Accepts optional `backend_url` input (workflow_dispatch/workflow_call)

`BACKEND_URL` source precedence:

1. `backend_url` workflow input (recommended from backend deploy output)
2. `BACKEND_URL` GitHub secret/variable

Required GitHub Environment secrets/variables:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `BACKEND_URL` (fallback if no backend_url input is provided)

To auto-update from backend deploy output, call the frontend workflow as reusable and pass the backend URL output:

```yaml
jobs:
  deploy_frontend:
    uses: ./.github/workflows/deploy-vercel.yml
    with:
      backend_url: ${{ needs.deploy_backend.outputs.backend_url }}
    secrets: inherit
```

Reference example: `.github/workflows/example-backend-to-frontend-sync.yml`
