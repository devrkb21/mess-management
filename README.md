# Mess Management Platform

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
docker compose up -d
```

## Documentation

- [Complete Build Guide](.gemini/mess-platform-agent-guide.md)
