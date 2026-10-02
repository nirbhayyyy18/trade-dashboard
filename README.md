# BSE Trades Dashboard

A real-time trades dashboard built as a technical assessment.

The application simulates pulling trade data from a BSE API where a complete data pull can take several minutes, while individual HTTP connections must remain short-lived.

## Tech Stack

### Backend

- Node.js
- Express
- TypeScript
- SQLite
- better-sqlite3
- WebSocket (`ws`)

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

---

## Architecture

```text
                     ┌─────────────────────┐
                     │    Mock BSE API     │
                     │    GET /getTrades   │
                     └──────────┬──────────┘
                                │
                         Paginated batches
                                │
                                ▼
                     ┌─────────────────────┐
                     │    Pull Service     │
                     │ Background Process  │
                     └──────────┬──────────┘
                                │
                         Store each batch
                                │
                                ▼
                     ┌─────────────────────┐
                     │       SQLite        │
                     │   trades + runs     │
                     └──────────┬──────────┘
                                │
                         WebSocket events
                                │
                                ▼
                     ┌─────────────────────┐
                     │   Next.js Dashboard │
                     │                     │
                     │  Live trade updates │
                     └─────────────────────┘
```

### How It Works

1. The dashboard loads previously stored trades from SQLite.
2. The user starts a new trade pull.
3. The backend immediately returns a `202 Accepted` response.
4. The actual pull runs in the background.
5. The backend requests trades from the Mock BSE API in batches.
6. Each batch is stored in SQLite.
7. After each batch, the backend broadcasts a `trades-updated` WebSocket event.
8. The dashboard receives the event and updates the table without refreshing the page.
9. After all batches are processed, a `pull-completed` event is sent.

---

## Why WebSocket?

A complete pull can take several minutes, while the network may terminate an HTTP connection held open for more than 30 seconds.

The application therefore does not keep the browser's HTTP request open while the pull is running.

Instead:

```text
POST /api/pulls
       │
       ▼
202 Accepted
       │
       ▼
Background Pull
       │
       ▼
WebSocket Events
       │
       ▼
Dashboard Updates
```

The initial HTTP request finishes immediately, while the background process continues pulling and storing trades.

WebSocket is then used to push newly received trades and pull progress to connected dashboards.

This keeps the dashboard responsive while the pull continues in the background.

---

## API Endpoints

### Health Check

```http
GET /health
```

Returns the current API health status.

---

### Mock BSE API

```http
GET /getTrades
```

Returns seeded trade data.

The endpoint supports pagination using `offset` and `limit`.

Example:

```http
GET /getTrades?offset=0&limit=500
```

Next batch:

```http
GET /getTrades?offset=500&limit=500
```

An optional response delay can also be configured:

```http
GET /getTrades?offset=0&limit=500&delayMs=1000
```

The mock API supports a configurable delay of up to 15 minutes.

---

### Stored Trades

```http
GET /api/trades
```

Returns trades currently stored in SQLite.

---

### Start Trade Pull

```http
POST /api/pulls
```

Starts a background trade pull.

Example response:

```json
{
  "success": true,
  "pullId": 15,
  "status": "running",
  "message": "Trade pull started"
}
```

The endpoint returns immediately while the pull continues in the background.

---

### WebSocket

```text
ws://localhost:5000/ws
```

The backend sends the following events:

- `connected`
- `trades-updated`
- `pull-completed`

---

## Database Design

The application uses SQLite with two main tables.

### `pull_runs`

Stores the status of each trade pull.

| Column | Description |
|---|---|
| `id` | Primary key |
| `status` | Current pull status |
| `started_at` | Pull start timestamp |
| `completed_at` | Pull completion timestamp |

### `trades`

Stores individual trade records.

| Column | Description |
|---|---|
| `id` | Primary key |
| `trade_id` | Unique trade identifier |
| `client` | Client name |
| `symbol` | Trading symbol |
| `quantity` | Trade quantity |
| `price` | Trade price |
| `timestamp` | Trade timestamp |
| `pull_run_id` | ID of the pull that imported the trade |

Each trade is associated with the pull that imported it through `pull_run_id`.

---

## Project Structure

```text
trade-dashboard/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── trades.controller.ts
│   │   ├── db/
│   │   │   └── database.ts
│   │   ├── routes/
│   │   │   ├── bse.routes.ts
│   │   │   ├── pulls.routes.ts
│   │   │   └── trades.routes.ts
│   │   ├── services/
│   │   │   ├── bseMock.service.ts
│   │   │   ├── pull.service.ts
│   │   │   └── websocket.service.ts
│   │   ├── types/
│   │   │   └── trade.ts
│   │   └── server.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       └── page.tsx
│   └── package.json
│
├── docs/
│   └── architecture.md
│
├── .gitignore
└── README.md
```

> The backend `.env` file is intentionally excluded from the repository through `.gitignore`.

---

## Environment Variables

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
PULL_BATCH_SIZE=500
PULL_DELAY_MS=5000
BSE_API_URL=http://localhost:5000
BSE_API_DELAY_MS=1000
```

### Environment Variable Reference

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `PULL_BATCH_SIZE` | Number of trades processed per batch | `500` |
| `PULL_DELAY_MS` | Delay between pull batches | `5000` |
| `BSE_API_URL` | Mock BSE API base URL | `http://localhost:5000` |
| `BSE_API_DELAY_MS` | Mock BSE API response delay | `1000` |

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nirbhayyyy18/trade-dashboard.git
cd trade-dashboard
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Backend Environment

Create:

```text
backend/.env
```

Add:

```env
PORT=5000
PULL_BATCH_SIZE=500
PULL_DELAY_MS=5000
BSE_API_URL=http://localhost:5000
BSE_API_DELAY_MS=1000
```

### 4. Start the Backend

For development:

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

The backend runs at:

```text
http://localhost:5000
```

### 5. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 6. Start the Frontend

For development:

```bash
npm run dev
```

The dashboard runs at:

```text
http://localhost:3000
```

---

## Testing

The following functionality has been tested:

- Mock BSE API pagination
- Background trade pull
- 3,000 seeded trades
- SQLite persistence
- Pull progress updates
- WebSocket live updates
- Dashboard updates without page refresh
- Duplicate pull protection
- Recovery of stale running pulls
- Backend TypeScript production build
- Frontend production build
- Production backend and frontend runtime

### Verified Pull Flow

The backend successfully processes the seeded dataset in batches:

```text
500 / 3000
1000 / 3000
1500 / 3000
2000 / 3000
2500 / 3000
3000 / 3000
```

Each processed batch is stored in SQLite and broadcast to connected dashboard clients through WebSocket.

---

## Production Build

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

---

## Real-Time Update Flow

The dashboard does not use a polling loop or cron/scheduler for real-time trade updates.

Instead:

```text
BSE API
   │
   ▼
Pull Service
   │
   ├── Store batch
   │
   └── WebSocket broadcast
             │
             ▼
        Next.js Dashboard
             │
             ▼
        Update UI state
```

This allows trades to appear on an already-open dashboard without requiring a page refresh.

---

## Error Handling

### Duplicate Pull Protection

Only one trade pull can run at a time.

If a pull is already running, another request receives:

```http
409 Conflict
```

### Stale Pull Recovery

If the backend restarts while a pull is marked as `running`, stale running pulls are recovered and marked as failed during server startup.

### BSE API Failure

If a Mock BSE API request fails, the corresponding pull is marked as failed.

---

## Documentation

Additional architecture details are available in:

```text
docs/architecture.md
```

---

## Repository

GitHub:

https://github.com/nirbhayyyy18/trade-dashboard