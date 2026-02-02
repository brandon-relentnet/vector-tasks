# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vector Tasks is a full-stack task management app with gamification (XP, Quests, Daily Briefings). React 19 frontend + Python FastAPI backend with PostgreSQL, Redis, and Socket.IO real-time updates.

## Commands

```bash
# Frontend
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run Vitest tests
npm run test:watch   # Watch mode for tests
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Run Prettier
npm run check        # Format + lint fix

# Backend
cd backend
python3 -m venv venv && source venv/bin/activate  # Setup venv
pip install -r requirements.txt                    # Install deps
uvicorn main:app --reload --port 8000             # Start dev server
python migrate.py                                  # Run database migrations

# Full stack (both ports)
./start.sh
```

## Architecture

### Frontend (`src/`)
- **TanStack Router**: File-based routing via `src/routes/*.tsx` files
- **Data Layer**: `src/data/dashboard-fns.ts` contains centralized `getDashboardData()` that fetches tasks, projects, and daily logs in parallel
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin

### Backend (`backend/main.py`)
- Single-file FastAPI app containing models, schemas, endpoints, and Socket.IO handlers
- **Day rollover**: 8:00 AM CST is treated as the next day
- **XP system**: Points = tasks completed today * 10
- **Caching**: Projects cached 5 min, daily logs cached 60 sec
- **Real-time**: Socket.IO broadcasts `update` events; frontend refetches data on receipt

### Key Patterns
- Routes are auto-generated from `src/routes/` file names
- All API endpoints return JSON; Socket.IO emits `update` for mutations
- Frontend connects to backend via `VITE_API_URL` env var (defaults to `http://localhost:8000`)
- TypeScript path aliases: `@/*` maps to `src/*` (configured in tsconfig.json)

### Environment
- Frontend: Create `.env` with `VITE_API_URL=http://localhost:8000`
- Backend: Uses PostgreSQL database; configure via environment variables
