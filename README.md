# GYLIO – Get Your Life In Order

Welcome to GYLIO, a cross‑platform app designed to help neurodivergent users manage tasks, schedules and personal finances.  
This repository contains an early skeleton of the app, including a React front end (bundled with Vite), an Expo configuration for running on web and mobile, an Express backend with MongoDB/SQLite fallback, and localisation via `react‑i18next` for English and Peruvian Spanish.

## Overview

GYLIO provides three key modules — **Tasks**, **Calendar** and **Budgeting** — and layers them with accessibility features drawn from research into ADHD, autism, dyslexia and dyspraxia.  
Gamification (points and streaks) and positive nudges can be enabled or disabled by the user.  
For more detailed design rationale and research, see the files in the `docs/` directory.

## Getting Started

These instructions assume you have Node.js ≥14 installed.  The repository uses Vite for rapid web development and Expo to run the same code on iOS/Android via React Native Web.  For offline testing, SQLite is used as a fallback database when MongoDB is not available.

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the development server (web)**:
   ```bash
   npm run dev
   ```
   This runs the Vite dev server on <http://localhost:5173>. The page will hot‑reload on changes.

3. **Start the API server** (optional):
   ```bash
   npm run start
   ```
   The Express server listens on port 3001 and provides a simple JSON API.  It writes to a local SQLite database if `MONGODB_URI` is not set.

4. **Run on mobile with Expo**:
   ```bash
   npm install -g expo-cli
   npm run expo
   ```
   You can then open the project on your device or emulator via the Expo Go app.  Expo’s web target also works with this setup.

## Project Structure

- **index.html** – HTML entry point for the web build.  
- **src/** – React source code.  
  - `App.jsx` – root component with navigation and language toggle.  
  - `components/` – stubs for Tasks, Calendar, Budget, Rewards and Settings views.  
  - `hooks/` – custom hooks (e.g. `useSpeech` for text‑to‑speech).  
  - `i18n/` – translation setup and JSON dictionaries.  
- **server/** – Express API with MongoDB/SQLite models and routes.  
  - `server.js` – starts the API server.  
  - `db/` – Mongoose schemas and SQLite fallback initialisation.  
  - `routes/` – routers for tasks, events and budget (currently very simple stubs).  
- **docs/** – design and research documentation describing accessible, ethical design practices for neurodivergent users.

## Accessibility & Ethical Design

This project draws from the principles documented in `docs/design-document.md` and `docs/research-manual.md`.  
Key accessibility considerations include:

- **Typography** – uses sans‑serif fonts and offers a dyslexia‑friendly alternative; adjustable sizes and line spacing.  
- **Colour palette** – soft, muted colours with high contrast options.  
- **Large targets** – buttons are at least 44×44 CSS pixels.  
- **Keyboard navigation** – all interactive controls are reachable via the keyboard with visible focus outlines.  
- **Text‑to‑speech** – hooks are provided for reading content aloud via Expo’s audio API.  
- **Gamification controls** – points/streaks can be hidden entirely for users who find them distracting.  
- **Multilingual** – English and Peruvian Spanish translation files live under `src/i18n/`, with a language toggle in the UI.

## Notes

- **Incomplete features** – This skeleton focuses on structure.  The task management, calendar and budgeting modules include minimal UI to indicate where future logic and state will live.  The backend includes simple CRUD endpoints for tasks and demonstrates how to fall back to SQLite when offline.
- **Offline support** – The Express API initialises a local SQLite database.  On the client side, service workers and IndexedDB integration would be added in later stages to provide offline caching and sync.  See `docs/design-document.md` for guidelines on implementing these features.

## Documentation

- **Design Document** – `docs/design-document.md` summarises the high‑level architecture, feature list, user flows, functional specs, roadmap and testing plan for GYLIO.  
- **Research Manual** – `docs/research-manual.md` contains a literature review on neurodivergent‑friendly design, gamification, nudge theory and Caleb Hammer‑style budgeting strategies.
