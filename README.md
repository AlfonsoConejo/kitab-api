# Kitab API

Backend REST API for Kitab.

The frontend repository contains the complete project overview, screenshots and live demo.

Frontend:
https://github.com/AlfonsoConejo/kitab

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT
- Bcrypt

## API Endpoints

### Authentication

Base path: `/api/auth`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/register` | Register a new user | ❌ |
| POST | `/login` | Authenticate a user and start a session | ❌ |
| GET | `/me` | Get the authenticated user's information | ✅ |
| POST | `/refresh` | Issue a new access token using a valid refresh token | ❌* |
| POST | `/logout` | Log out the current session | ❌* |
| POST | `/logout-all` | Log out from all active sessions | ✅ |

\* Uses the refresh token stored in an HttpOnly cookie.
