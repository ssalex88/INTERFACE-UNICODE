# NUTRIA — Product Context

## What is NUTRIA?

NUTRIA is a preventive wellness web platform initially designed for Peruvian university students.

It is NOT:
- a medical application
- a diagnosis system
- a calorie counter
- a diet or weight-loss app
- a chatbot
- a generic restaurant recommender

Its purpose is to help a student make a small, realistic decision based on their current university context.

## Core problem

Students often already know they should sleep better, eat regularly, rest, or manage stress.

The difficult part is deciding what they can realistically do TODAY considering:

- limited time between classes
- limited budget
- real food options near campus
- how they feel that day
- academic workload

NUTRIA turns a very quick daily record into useful context.

Example:

User writes:

"Dormí 4 horas, no almorcé y tengo S/12."

NUTRIA interprets:

- sleepHours: 4
- skippedLunch: true
- budget: 12

Then it uses recent history to:

1. Detect explainable patterns.
2. Give one contextual recommendation.
3. Suggest one small achievable goal.

## Product principles

1. Low friction.
2. Real university context.
3. Privacy.
4. Small sustainable changes.

A daily registration should take only a few seconds.

Do not require:
- calories
- macros
- weight
- BMI
- food weighing
- long health forms

## Main flow

REGISTER
? INTERPRET
? STORE
? DETECT PATTERNS
? RECOMMEND
? PROPOSE SMALL GOAL
? REGISTER AGAIN

## Hackathon MVP

The MVP prioritizes only three complete flows:

### 1. Natural-language registration

The student can write:

"poco sueño, salté el almuerzo, estoy estresado y tengo 12 soles."

Extract possible fields such as:

- sleep hours
- meals skipped
- energy
- stress
- mood
- budget
- academic workload
- exam / assignment / presentation events

Not every field must exist in every record.

### 2. Local pattern engine

Analyze recent history using simple and explainable rules.

Examples:

- "Esta semana omitiste el almuerzo 3 veces."
- "Los días con entregas dormiste aproximadamente 2 horas menos."
- "Tu energía suele ser menor después de noches con poco sueño."

Patterns may use windows such as:

- 7 days
- 14 days
- 28 days

Avoid black-box conclusions.

### 3. Campus food recommendation

Use a seed dataset of food options around the university.

Possible fields:

- place
- dish
- price
- distance
- approximate time
- category
- availability
- student rating

Recommendation priority:

1. budget
2. location
3. available time
4. student context
5. availability

Calories are NOT the primary recommendation criterion.

Initial pilot campus:

Universidad de Lima.

## Small goals

Examples:

- "Almuerza al menos 3 días esta semana."
- "Registra cómo te fue 4 días."
- "Intenta mantener tu horario de sueño dos noches seguidas."

Never reward or recommend:
- eating less
- skipping meals
- losing weight
- caloric deficit
- restrictive dieting

## Gamification

Possible future elements:

- streaks
- badges
- weekly challenges
- progress
- NUTRIA mascot

The mascot is NOT a chatbot.

Gamification rewards consistency and achievable goals.

## Privacy

Privacy is a core architectural principle.

Whenever practical:

LOCAL:
- original natural-language phrase
- personal history
- individual patterns
- sensitive student information

SERVER:
- shared structured information
- food datasets
- menus
- prices
- reviews
- community information
- anonymous aggregate statistics

The raw personal phrase should not be sent to a server just for analytics.

The core product should work without requiring an account.

## Interpretation architecture

Layer 1 — deterministic parser:

Use:
- regex
- dictionaries
- keywords
- simple rules

Recognize examples such as:
- "S/12"
- "12 soles"
- "no almorcé"
- "dormí 4 horas"
- "tengo parcial"
- "ando estresado"

The MVP must work with this layer alone.

Layer 2 — optional local model:

A small in-browser model may later help with ambiguous phrases.

The application must NOT depend on it.

## UX

NUTRIA should feel modern and university-oriented.

Prioritize:
- cards
- simple navigation
- few actions per screen
- clear hierarchy
- responsive/mobile-first design
- microinteractions
- weekly progress
- short texts
- immediate feedback

Avoid:
- hospital-like UI
- childish UI
- overloaded dashboards
- giant tables
- medical forms
- excessive graphs
- unnecessary clinical terminology

## Existing prototype

`scratch-existing-code/` contains previous code.

It is reference material only.

Rules:
- Read it if useful.
- Never modify it.
- Never move it.
- Never include it in Git.
- Do not assume its architecture is correct.
- Reuse only ideas/components that fit this document.

## Hackathon development rules

Before implementing a feature:

1. Check whether it belongs to the MVP.
2. Avoid features that only look impressive.
3. Keep the main flow working.
4. Avoid overarchitecture.
5. Optimize for live demo stability.
6. Keep code modular.
7. Do not break previous functionality.
8. Prefer simple implementations when time is limited.
9. Do not turn NUTRIA into a chatbot.
10. Do not turn NUTRIA into a calorie app.
11. Preserve local privacy principles.
12. Every new feature must solve a concrete user problem.

## Demo objective

A judge should understand in less than 30 seconds:

"NUTRIA entiende rápidamente cómo estuvo mi día, detecta patrones de mis hábitos y me ayuda a tomar una decisión pequeña y realista dentro de mi contexto universitario."

Optimize for:

- clarity
- usefulness
- differentiation
- demo quality
- stability
- user experience
