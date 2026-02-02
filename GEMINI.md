# Project Context: Vector Tasks

## Overview
Vector Tasks is a full-stack task management application designed with gamification elements (XP, Quests) and a daily logging system. It features a modern React frontend and a robust Python FastAPI backend, utilizing real-time updates via Socket.IO.

## Tech Stack

### Frontend
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Routing:** TanStack Router (File-based routing)
*   **Styling:** Tailwind CSS (v4)
*   **HTTP Client:** Axios
*   **Real-time:** Socket.IO Client

### Backend
*   **Framework:** FastAPI (Python)
*   **Server:** Uvicorn
*   **Database:** PostgreSQL (SQLAlchemy ORM)
*   **Caching/State:** Redis
*   **Real-time:** Socket.IO

## Getting Started

### Quick Start
The project includes a helper script to start both the backend and frontend services:

```bash
./start.sh
```
*Note: This script will kill existing processes on ports 3000 and 8000.*

### Manual Setup & Running

#### Backend
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the server:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

#### Frontend
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

## Project Structure

### Frontend (`src/`)
*   **`routes/`**: Contains the application routes (TanStack Router).
    *   `__root.tsx`: The root layout component.
    *   `index.tsx`: The main dashboard view.
    *   `briefings.tsx`: Route for daily briefings/logs.
*   **`data/`**: Handles data fetching and API logic.
    *   `dashboard-fns.ts`: Main API service file containing Axios setup and data fetching functions (`getDashboardData`, `createTask`, etc.).
*   **`components/`**: Reusable UI components (Header, UI primitives).
*   **`lib/`**: Utility functions.

### Backend (`backend/`)
*   **`main.py`**: The core FastAPI application. Defines:
    *   Database models (`Project`, `Task`, `DailyLog`).
    *   Pydantic schemas (`TaskCreate`, `TaskOut`, etc.).
    *   API endpoints (`/tasks`, `/projects`, `/daily-log`).
    *   Socket.IO event handlers.
*   **`migrate.py`**: Database migration script (using SQLAlchemy).
*   **`requirements.txt`**: Python dependencies.

## Key Features & terminology
*   **Quests:** Active tasks that are not yet "Done".
*   **XP:** Experience points calculated based on tasks completed today.
*   **Daily Log:** A record of daily activities, including "Big Wins", briefings (Morning, Midday, Shutdown), and reflections.
*   **Rollover Logic:** The backend (`main.py`) handles a "local day" logic where the day rolls over at 8:00 AM local time.

## Configuration
*   **Database & Redis:** Connection strings are currently defined in `backend/main.py`.
*   **API URL:** The frontend connects to `http://localhost:8000`, defined in `src/data/dashboard-fns.ts`.

## Development Conventions
*   **Routing:** To add a new page, create a file in `src/routes/`. TanStack Router handles route generation.
*   **Styling:** Use Tailwind utility classes.
*   **State:** The application relies on `getDashboardData` to fetch a consolidated state object (XP, Quests, History, Projects, DailyLog).
