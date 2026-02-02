# Vector Tasks

A gamified task management application with XP, Quests, and Daily Briefings.

## Tech Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS v4
- **Backend**: Python FastAPI, PostgreSQL, Redis, Socket.IO

## API Documentation

The API is served at `https://api.vector.olvyx.com` (or `http://localhost:8000` locally).

### Documentation Links

| Resource | URL | Description |
|----------|-----|-------------|
| **OpenAPI JSON** | `/openapi.json` | Raw OpenAPI 3.0 schema - best for AI consumption |
| **Swagger UI** | `/docs` | Interactive API explorer |
| **ReDoc** | `/redoc` | Alternative API documentation view |

### AI Integration

For AI agents and assistants, use the OpenAPI JSON endpoint:

```bash
curl https://api.vector.olvyx.com/openapi.json
```

This provides complete schema information including:
- All endpoints and HTTP methods
- Request parameters and body schemas
- Response schemas and data types

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| GET | `/projects/{id}` | Get project by ID |
| POST | `/projects` | Create new project |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |
| GET | `/tasks` | List tasks (supports `project_id`, `status`, `priority` filters) |
| GET | `/tasks/active` | List incomplete tasks |
| GET | `/tasks/{id}` | Get task by ID |
| POST | `/tasks` | Create new task |
| PATCH | `/tasks/{id}` | Update task |
| DELETE | `/tasks/{id}` | Delete task |
| GET | `/daily-log` | Get today's daily log |
| POST | `/daily-log/briefing` | Add briefing |
| GET | `/daily-log/history` | Get historical logs |
| POST | `/daily-log/update` | Update daily log |
| POST | `/daily-log/mark-goal` | Mark goal as completed |
| GET | `/health` | Health check |

## Development

### Frontend

```bash
npm install
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run linting
```

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Full Stack

```bash
./start.sh
```

## License

MIT
