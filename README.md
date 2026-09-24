Set `NEXT_PUBLIC_API_URL` and `EXPO_PUBLIC_API_URL` in the app environment
files to the API endpoint. Add `--profile tools`
# Mess Management Platform

![CI](https://github.com/devrkb21/mess-management/actions/workflows/ci.yml/badge.svg)

A full-stack platform for Bangladesh's shared housing ("mess") ecosystem — digitizing daily meal tracking, expense management, and bill generation for shared living arrangements.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Users                          │
└──────────┬──────────────────┬───────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │  Next.js    │    │ Expo (RN)   │
    │  (Web App)  │    │  (Mobile)   │
    └──────┬──────┘    └──────┬──────┘
           │                  │
           └────────┬─────────┘
                REST API + WebSocket
           ┌────────▼─────────┐
           │   Laravel 13     │
           │   (Backend API)  │
           └────────┬─────────┘
                    │
       ┌────────────┼────────────┐
  ┌────▼───┐   ┌────▼───┐   ┌────▼───┐
  │Postgres│   │ Redis  │   │  R2    │
  │  (DB)  │   │(Cache/ │   │(Files) │
  │        │   │ Queue) │   │        │
  └────────┘   └────────┘   └────────┘
```

## Project Structure

- `backend/` — Laravel 13 API (PHP 8.5)
- `web/` — Next.js 16 Web Dashboard (TypeScript)
- `mobile/` — Expo/React Native Mobile App (TypeScript)
- `docker-compose.yml` — Local dev services (PostgreSQL, Redis)

## Getting Started

### Prerequisites
- PHP 8.5+ with extensions: zip, fileinfo, gd, pdo_pgsql, sodium, mbstring, curl, openssl
- Composer 2.x
- Node.js 20+ & npm
- PostgreSQL 16+ (or use Docker Compose)
- Redis 7+ (or use Docker Compose)

### Backend Setup
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

### With Docker (PostgreSQL + Redis)
```bash
cp .env.example .env
docker compose up -d --build
```

The web app is available at `http://localhost:8080` and the Laravel API at
`http://localhost:8001` by default. Set `WEB_PORT` and `BACKEND_PORT` in `.env`
to choose different host ports. The clients use `https://mess.czbd.dev/api/v1`
as their fixed API endpoint. Add `--profile tools`
to start pgAdmin at `http://127.0.0.1:5050`. PostgreSQL and Redis are private
Compose services and do not consume host ports.

To stop the stack and remove its local data volumes:

```bash
docker compose down --volumes
```

## Branches

- `dev` is the active development branch.
- `pub` is the stable branch and the repository default.

Every push and pull request targeting either branch runs backend tests, web
and mobile validation, and a full Docker Compose smoke test through GitHub
Actions.

## Documentation

- [Complete Build Guide](.gemini/mess-platform-agent-guide.md)
