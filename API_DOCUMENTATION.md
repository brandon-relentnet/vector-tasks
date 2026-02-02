# Vector Tasks API Documentation

## Overview
The Vector Tasks API manages tasks, projects, and daily logging with a focus on tactical execution and daily briefing workflows.

**Base URL:** `https://api.vector.olvyx.com`

**Authentication:** Currently Public (Open Access). *Note: Ensure network security or add auth layer if exposing sensitive data.*

---

## Resources & Schemas

### 1. Task (`Task`)
Represents an actionable item or mission.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Unique identifier. |
| `title` | String | Main objective text. |
| `description` | String | Optional details. |
| `priority` | String | "Low", "Med", "High". Default: "Med". |
| `status` | String | "Todo", "Working", "Done". Default: "Todo". |
| `project_id` | Integer | ID of the assigned Sector (Project). |
| `subtasks` | List | Array of sub-items (currently JSON). |
| `created_at` | DateTime | ISO 8601 timestamp. |
| `updated_at` | DateTime | ISO 8601 timestamp. |

### 2. Project (`Project`)
Represents a Sector or category for grouping tasks.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Unique identifier. |
| `name` | String | Sector name (e.g., "Operations", "Development"). |
| `description` | String | Optional details. |
| `category` | String | Broad category tag. |

### 3. Daily Log (`DailyLog`)
A journal entry for a specific day, handling briefings and reflections.
**Key Concept:** The "Day" rolls over at **8:00 AM CST**. Operations before 8 AM belong to the *previous* calendar date.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Unique identifier. |
| `date` | Date | YYYY-MM-DD. Unique constraint. |
| `big_win` | String | The primary objective or highlight of the day. |
| `starting_nudge` | String | Motivation or initial thought. |
| `morning_briefing` | String | Strategic plan for the day (Start of day). |
| `midday_briefing` | String | Adjustment or check-in (Noon). |
| `shutdown_briefing` | String | Closing ritual notes (End of work). |
| `nightly_reflection` | String | Final thoughts before sleep. |
| `goals_for_tomorrow` | List[String] | Array of text targets for the next day. |
| `reflections` | String | General notes or "completed goals" tracking string (pipe-delimited). |

---

## Endpoints

### Tasks

#### `GET /tasks`
Retrieve a list of tasks.
*   **Query Params:**
    *   `project_id` (int, optional): Filter by Sector.
    *   `status` (str, optional): Filter by status (e.g., "Todo").
*   **Response:** `List[Task]`

#### `POST /tasks`
Create a new mission objective.
*   **Body:**
    ```json
    {
      "title": "Secure the perimeter",
      "priority": "High",
      "project_id": 1,
      "status": "Todo"
    }
    ```
*   **Response:** `Task`

#### `PATCH /tasks/{task_id}`
Update task details (status, priority, etc.).
*   **Path Param:** `task_id` (int)
*   **Body:** (Partial Task object)
    ```json
    {
      "status": "Done"
    }
    ```
*   **Response:** `Task`

#### `DELETE /tasks/{task_id}`
Remove a task permanently.
*   **Response:** `{"message": "Task deleted"}`

### Projects

#### `GET /projects`
Retrieve all available Sectors.
*   **Response:** `List[Project]`

### Daily Operations (Logs)

#### `GET /daily-log`
Get the log entry for the *current* operational day (based on 8 AM rollover).
*   **Response:** `DailyLog` (or `null` if not started).

#### `POST /daily-log/update`
Create or update the current day's log.
*   **Body:** (Partial DailyLog object)
    ```json
    {
      "big_win": "Deployed new feature",
      "goals_for_tomorrow": ["Fix bugs", "Write docs"]
    }
    ```
*   **Response:** `DailyLog`

#### `GET /daily-log/history`
Retrieve past logs.
*   **Query Params:**
    *   `limit` (int, default 10): Number of entries.
    *   `offset` (int, default 0): Pagination offset.
    *   `has_morning` (bool): Filter logs with morning briefings.
    *   `has_night` (bool): Filter logs with nightly reflections.
*   **Response:** `List[DailyLog]`

---

## Real-Time Updates
The API uses **Socket.IO** to broadcast updates.
*   **Event:** `update`
*   **Payload:** `{'timestamp': '...'}`
*   **Action:** Clients should re-fetch data (`/tasks`, `/daily-log`) when this event is received to stay in sync.
