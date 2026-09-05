# NUTRIA Development Rules

## Product source of truth

Before planning or implementing any NUTRIA feature, read:

`NUTRIA_CONTEXT.md`

This document is the official product specification.

If a new request contradicts it, warn the user before implementing it.

## Hackathon MVP

Prioritize these three complete flows:

1. Natural-language daily registration.
2. Local habit-pattern detection.
3. Campus food recommendation by budget and available time.

## Stack

- Frontend: React + Vite
- Backend: FastAPI only when a server is actually needed
- Database: PostgreSQL only for shared/server-side data
- Personal and sensitive habit data should remain local whenever practical

## General rules

- Keep the architecture simple for a hackathon.
- Prefer small and understandable changes.
- Avoid unnecessary dependencies.
- Do not introduce microservices.
- Do not commit secrets or environment variables.
- Do not modify unrelated code.
- Prioritize demo stability over feature count.

## Product constraints

Do not turn NUTRIA into:

- a chatbot
- a calorie counter
- a diet app
- a weight-loss app
- a medical diagnosis system
- a generic restaurant recommender

## Existing reference code

The directory `scratch-existing-code/` contains previous implementation code.

It is reference material only.

- You may read it.
- Do not modify it.
- Do not move it.
- Do not copy it blindly into the production app.
- Compare it against NUTRIA_CONTEXT.md before reusing anything.
- Reuse only components or logic that fit the current MVP.

## Frontend

- Use reusable React components.
- Prefer mobile-first responsive design.
- Keep screens focused and simple.
- Avoid overloaded dashboards.
- Keep the main user flow connected.

## Quality

- Preserve working functionality.
- Explain important architectural decisions briefly.
- Prefer simple implementations when time is limited.
- Run relevant checks before completing substantial changes.
