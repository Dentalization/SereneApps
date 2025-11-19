# Serene AI Backend (Express.js)

JavaScript backend for auth and future APIs. Matches the frontend contract under `/v1`.

## Quick Start

1) Start Postgres via Docker
```
cd backend
docker compose up -d
```

2) Configure env
```
cp .env.example .env
# update JWT_SECRET and CORS_ORIGINS as needed
```

3) Run migrations
```
npm install
npm run migrate
```

4) Start server
```
npm run dev
# or: npm start
```

The API listens on `http://localhost:4000`. Version prefix is `/v1` (configurable via `API_VERSION`).

## Endpoints
- POST `/v1/auth/register` → `{ name,email,password }`
- POST `/v1/auth/login` → `{ accessToken, refreshToken, user }`
- GET `/v1/auth/me` → requires `Authorization: Bearer <token>`
- POST `/v1/auth/refresh` → `{ accessToken }` (body: `{ refreshToken }`)
- POST `/v1/auth/logout` → optional body `{ refreshToken }`

## Env Vars
- `PORT` default 4000
- `API_VERSION` default `v1`
- `DATABASE_URL` connection string
- `JWT_SECRET` long random string
- `CORS_ORIGINS` comma-separated list (e.g., `http://localhost:4028,https://www.sereneai.com`)
- `ACCESS_TTL` (e.g., `15m`), `REFRESH_TTL` (e.g., `7d`)

## Notes
- New web registrations default to role `dentist`. Adjust in `src/routes/auth.js` if needed.
- For production, host Postgres and the API behind TLS; set `PGSSLMODE=require` if using SSL.
- If you later shift to cookie-based sessions, remove the bearer header pattern and enable `credentials` + proper CORS.

