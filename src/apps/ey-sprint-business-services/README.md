# EY Sprint Business Services (NestJS)

NestJS backend microservice for sprint planning APIs.

## Quick Start

```bash
npm install
npm run start:dev
```

Service runs on `http://localhost:3000` by default and prefixes routes with `/api`.

## Tests

```bash
npm test
npm run test:e2e
```

## Docker

This app is containerized via `src/apps/ey-sprint-business-services/Dockerfile` and orchestrated in root `docker-compose.yml`.

## Main Endpoints

- `POST /api/auth/signin`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/submissions`
- `GET /api/sprints`
- `GET /api/roles`
- `GET /api/teams`
- `GET /api/users`

## Architecture

- `src/common` - cross-cutting concerns (guards, filters, middleware)
- `src/config` - typed configuration
- `src/modules` - feature modules (`auth`, `users`, `teams`, `roles`, `sprints`, `submissions`)

`SprintsService` and `SubmissionsService` are native Nest providers.
