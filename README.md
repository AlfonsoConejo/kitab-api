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
- TypeScript


## API Endpoints

### Health Check

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/health` | Reports API status and PostgreSQL connectivity | ❌ |

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
| GET | `/:periodId/calendar-events` | Get calendar events for an academic period | ✅ |

### Subjects

Base path: `/api/subjects`. This module also owns the subject and class routes scoped by an academic period.

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/api/periods/:periodId/subjects` | Create a new subject within an academic period | ✅ |
| GET | `/api/periods/:periodId/subjects` | Get all subjects belonging to an academic period | ✅ |
| PUT | `/:subjectId` | Update a subject and its classes | ✅ |
| DELETE | `/:subjectId` | Delete a subject | ✅ |
| POST | `/:subjectId/classes` | Create one or more classes for a subject | ✅ |
| GET | `/:subjectId/with-classes` | Get a subject with all of its associated classes | ✅ |
| GET | `/api/periods/:periodId/classes` | Get all classes associated with an academic period | ✅ |
| POST | `/api/periods/:periodId/classes/conflicts/external` | Find schedule conflicts while creating a subject | ✅ |
| POST | `/:subjectId/classes/conflicts/external` | Find schedule conflicts while editing a subject | ✅ |
| POST | `/classes/conflicts/internal` | Find schedule conflicts between classes in the request payload | ✅ |

### Days Off

Collection endpoints: `/api/periods/:periodId/days-off`. Individual-resource endpoints: `/api/days-off/:dayOffId`.

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/api/periods/:periodId/days-off` | Get all days off for the academic period | ✅ |
| POST | `/api/periods/:periodId/days-off` | Create a day off within the academic period | ✅ |
| GET | `/api/days-off/:dayOffId` | Get a specific day off and infer its academic period | ✅ |
| PUT | `/api/days-off/:dayOffId` | Update a day off and infer its academic period | ✅ |
| DELETE | `/api/days-off/:dayOffId` | Delete a day off and infer its academic period | ✅ |

## Response Format

All responses are returned in JSON format.

## Error Handling

The API returns appropriate HTTP status codes and JSON error messages for invalid requests, authentication failures, validation errors and server errors.

## Authentication

The API uses JWT access tokens for protected endpoints and HttpOnly refresh token cookies for session renewal.

All state-changing `/api` requests must also include an allowed `Origin` header configured through `ALLOWED_ORIGINS`.
