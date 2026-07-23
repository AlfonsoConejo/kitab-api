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

### Academic Periods

Base path: `/api/periods`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/` | Get all academic periods for the authenticated user | ✅ |
| POST | `/` | Create a new academic period | ✅ |
| GET | `/:periodId` | Get a specific academic period | ✅ |
| PUT | `/:periodId` | Update an academic period | ✅ |
| DELETE | `/:periodId` | Delete an academic period | ✅ |
| GET | `/:periodId/subjects` | Get all subjects belonging to an academic period | ✅ |
| POST | `/:periodId/subjects` | Create a new subject within an academic period | ✅ |
| GET | `/:periodId/classes` | Get all classes associated with an academic period | ✅ |

### Subjects

Base path: `/api/subjects`

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/:subjectId` | Create one or more classes for a subject | ✅ |
| DELETE | `/:subjectId` | Delete a subject | ✅ |
| GET | `/:subjectId/with-classes` | Get a subject with all of its associated classes | ✅ |

## Response Format

All responses are returned in JSON format.

## Error Handling

The API returns appropriate HTTP status codes and JSON error messages for invalid requests, authentication failures, validation errors and server errors.

## Authentication

The API uses JWT access tokens for protected endpoints and HttpOnly refresh token cookies for session renewal.
