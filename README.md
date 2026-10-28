# GoCookFood

A Letterboxd-style recipe app: save recipes, log what you cook, and see what others are making.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma 7
- **Cache:** Redis
- **Testing:** Vitest, Supertest
- **Local dev:** Docker Compose

## Prerequisites

- Node.js
- Docker Desktop

## Getting Started

### 1. Start the databases

```bash
docker compose up -d
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

## Scripts (backend)

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the server with hot reload |
| `npm test`          | Run tests in watch mode          |
| `npm run test:run`  | Run tests once                   |
| `npx prisma studio` | Browse the database              |

## Troubleshooting

**Port 5432 already in use:** another Postgres is running locally. Check with `lsof -i :5432`, and stop it (e.g. `brew services stop postgresql@16`) or change the host port in `docker-compose.yml`.
