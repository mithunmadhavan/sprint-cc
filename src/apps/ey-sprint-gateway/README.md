# EY Sprint Gateway (NGINX)

NGINX reverse proxy for single-port Docker access.

- `/` -> `ey-sprint-frontend:3001`
- `/api/*` -> `ey-sprint-business-services:3000`

The gateway is exposed on host port `3000` via `docker-compose.yml`.

