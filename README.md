\# BSE Trades Dashboard



A real-time trades dashboard built as a technical assessment.



The application simulates pulling trade data from a BSE API where a complete data pull can take several minutes, while individual HTTP connections must remain short-lived.



\## Tech Stack



\### Backend

\- Node.js

\- Express

\- TypeScript

\- SQLite

\- better-sqlite3

\- WebSocket (`ws`)



\### Frontend

\- Next.js

\- React

\- TypeScript

\- Tailwind CSS



\## Architecture



```text

&#x20;                   ┌─────────────────────┐

&#x20;                   │    Mock BSE API     │

&#x20;                   │    GET /getTrades   │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                    Paginated batches

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │   Pull Service      │

&#x20;                   │  Background Worker  │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │       SQLite        │

&#x20;                   │   trades + runs     │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                   WebSocket events

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │   Next.js Dashboard │

&#x20;                   │                     │

&#x20;                   │ Live trade updates  │

&#x20;                   └─────────────────────┘

How It Works

The dashboard loads previously stored trades from SQLite.

The user starts a new trade pull.

The backend immediately returns a 202 Accepted response.

The actual pull runs in the background.

The backend requests trades from the Mock BSE API in batches.

Each batch is stored in SQLite.

After each batch, the backend broadcasts a trades-updated WebSocket event.

The dashboard receives the event and updates the table without refreshing the page.

After all batches are processed, a pull-completed event is sent.

Why WebSocket?



A complete pull can take several minutes, while the network may terminate an HTTP connection held open for more than 30 seconds.



The application therefore does not keep the browser's HTTP request open while the pull is running.



Instead:



POST /api/pulls starts the background operation.

The HTTP request finishes immediately.

WebSocket is used to push progress and newly received trades to connected dashboards.



This allows the dashboard to remain responsive while the pull continues in the background.



API Endpoints

Health Check

GET /health

Mock BSE API

GET /getTrades



Supports pagination:



GET /getTrades?offset=0\&limit=500



Optional delay:



GET /getTrades?offset=0\&limit=500\&delayMs=1000

Stored Trades

GET /api/trades



Returns trades stored in SQLite.



Start Pull

POST /api/pulls



Starts a background trade pull.



Example response:



{

&#x20; "success": true,

&#x20; "pullId": 15,

&#x20; "status": "running",

&#x20; "message": "Trade pull started"

}

WebSocket

ws://localhost:5000/ws



Events:



connected

trades-updated

pull-completed

Database



The application uses SQLite with two main tables.



pull\_runs



Stores the status of each pull.



Fields:



id

status

started\_at

completed\_at

trades



Stores trade records.



Fields:



id

trade\_id

client

symbol

quantity

price

timestamp

pull\_run\_id



Each trade is linked to the pull that imported it.



Project Structure

trade-dashboard/

├── backend/

│   ├── src/

│   │   ├── controllers/

│   │   ├── db/

│   │   ├── routes/

│   │   ├── services/

│   │   ├── types/

│   │   └── server.ts

│   ├── .env

│   ├── package.json

│   └── tsconfig.json

│

├── frontend/

│   ├── src/

│   │   └── app/

│   │       └── page.tsx

│   └── package.json

│

└── docs/

Environment Variables



Backend .env:



PORT=5000

PULL\_BATCH\_SIZE=500

PULL\_DELAY\_MS=5000

BSE\_API\_URL=http://localhost:5000

BSE\_API\_DELAY\_MS=1000

Setup

1\. Clone the repository

git clone <YOUR\_REPOSITORY\_URL>

cd trade-dashboard

2\. Install backend dependencies

cd backend

npm install

3\. Configure environment



Create:



backend/.env



and add:



PORT=5000

PULL\_BATCH\_SIZE=500

PULL\_DELAY\_MS=5000

BSE\_API\_URL=http://localhost:5000

BSE\_API\_DELAY\_MS=1000

4\. Start backend



Development:



npm run dev



Production:



npm run build

npm start



Backend:



http://localhost:5000

5\. Install frontend dependencies



Open another terminal:



cd frontend

npm install

6\. Start frontend



Development:



npm run dev



Frontend:



http://localhost:3000

Testing



The following functionality was tested:



Mock BSE API pagination

Background trade pull

3,000 seeded trades

SQLite persistence

Pull progress updates

WebSocket live updates

Dashboard updates without page refresh

Duplicate pull protection

Recovery of stale running pulls

Backend TypeScript build

Frontend production build

Production Build



Backend:



cd backend

npm run build

npm start



Frontend:



cd frontend

npm run build

npm start

Notes



The dashboard does not use a polling loop or cron/scheduler for real-time updates.



Trade updates are pushed from the backend to connected dashboards using WebSocket events.

