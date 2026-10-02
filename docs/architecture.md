\# Architecture Note



\## 1. Overview



The system consists of three main components:



1\. Mock BSE API

2\. Backend trade ingestion service

3\. Next.js real-time dashboard



The backend pulls trade data from the Mock BSE API in batches, stores the records in SQLite, and pushes newly received trades to connected dashboards through WebSocket.



\---



\## 2. Architecture Diagram



```text

&#x20;                        ┌──────────────────────┐

&#x20;                        │      Mock BSE API     │

&#x20;                        │                      │

&#x20;                        │  GET /getTrades      │

&#x20;                        │  offset + limit      │

&#x20;                        └──────────┬───────────┘

&#x20;                                   │

&#x20;                             HTTP batches

&#x20;                                   │

&#x20;                                   ▼

&#x20;                        ┌──────────────────────┐

&#x20;                        │    Pull Service      │

&#x20;                        │                      │

&#x20;                        │ Background process   │

&#x20;                        │ Pagination           │

&#x20;                        │ Batch processing     │

&#x20;                        └──────────┬───────────┘

&#x20;                                   │

&#x20;                          Insert each batch

&#x20;                                   │

&#x20;                                   ▼

&#x20;                        ┌──────────────────────┐

&#x20;                        │       SQLite         │

&#x20;                        │                      │

&#x20;                        │    pull\_runs         │

&#x20;                        │    trades            │

&#x20;                        └──────────┬───────────┘

&#x20;                                   │

&#x20;                         WebSocket events

&#x20;                                   │

&#x20;                                   ▼

&#x20;                        ┌──────────────────────┐

&#x20;                        │   Next.js Dashboard  │

&#x20;                        │                      │

&#x20;                        │ Initial DB load      │

&#x20;                        │ Live trade updates   │

&#x20;                        │ Pull progress        │

&#x20;                        └──────────────────────┘

3. Data Flow

Initial Dashboard Load

Browser

&#x20;  │

&#x20;  │ GET /api/trades

&#x20;  ▼

Backend

&#x20;  │

&#x20;  │ SELECT trades

&#x20;  ▼

SQLite

&#x20;  │

&#x20;  │ Stored trades

&#x20;  ▼

Backend

&#x20;  │

&#x20;  ▼

Dashboard



The dashboard therefore shows trades that were already pulled before the user opened the application.



Starting a Pull

Dashboard

&#x20;  │

&#x20;  │ POST /api/pulls

&#x20;  ▼

Backend

&#x20;  │

&#x20;  ├── Create pull\_runs record

&#x20;  │

&#x20;  └── Start background pull

&#x20;            │

&#x20;            ▼

&#x20;       Mock BSE API



The HTTP request returns immediately with 202 Accepted.



The pull continues independently in the background.



Batch Processing

Pull Service

&#x20;    │

&#x20;    ├── offset=0, limit=500

&#x20;    │

&#x20;    ├── Store batch in SQLite

&#x20;    │

&#x20;    ├── Broadcast trades-updated

&#x20;    │

&#x20;    ├── offset=500

&#x20;    │

&#x20;    ├── Store next batch

&#x20;    │

&#x20;    ├── Broadcast trades-updated

&#x20;    │

&#x20;    └── Continue until all records are processed



This avoids loading the entire dataset into a single long-running HTTP request.



4\. Why Background Processing?



A complete BSE data pull may take several minutes.



Keeping the dashboard's HTTP request open for the entire duration would make the application dependent on a long-lived HTTP connection.



Instead, the API starts the pull and returns immediately.



POST /api/pulls

&#x20;      │

&#x20;      ▼

&#x20;  202 Accepted

&#x20;      │

&#x20;      ▼

Background Pull



This allows the user interface to remain responsive while the backend continues processing.



5\. Why Pagination?



The Mock BSE API supports:



offset

limit



For example:



/getTrades?offset=0\&limit=500

/getTrades?offset=500\&limit=500

/getTrades?offset=1000\&limit=500



The pull service processes one batch at a time.



Benefits:



Smaller API responses

Lower memory usage

Incremental database writes

Incremental real-time updates

No single request needs to return the entire dataset

6\. Why WebSocket?



The dashboard needs to receive newly pulled trades while it is already open.



WebSocket provides a persistent connection specifically for server-to-client events.



The backend sends:



trades-updated



Sent after each successfully stored batch.



Example:



{

&#x20; "event": "trades-updated",

&#x20; "data": {

&#x20;   "pullId": 15,

&#x20;   "batchSize": 500,

&#x20;   "processed": 1500,

&#x20;   "total": 3000

&#x20; }

}

pull-completed



Sent when the complete pull finishes.



Example:



{

&#x20; "event": "pull-completed",

&#x20; "data": {

&#x20;   "pullId": 15,

&#x20;   "total": 3000

&#x20; }

}



The frontend updates its state from these events.



7\. Why Not Polling?



The requirement is to update the dashboard without using a polling loop.



Therefore, the frontend does not repeatedly call:



GET /api/trades



Instead:



Backend

&#x20;  │

&#x20;  │ WebSocket event

&#x20;  ▼

Frontend

&#x20;  │

&#x20;  ▼

Update React state



This provides immediate updates without repeated HTTP requests.



8\. Database Design

pull\_runs



Tracks every pull operation.



Column	Purpose

id	Primary key

status	running, completed, or failed

started\_at	Pull start time

completed\_at	Pull completion time

trades



Stores individual trade records.



Column	Purpose

id	Primary key

trade\_id	Unique trade identifier

client	Client name

symbol	Security symbol

quantity	Trade quantity

price	Trade price

timestamp	Trade timestamp

pull\_run\_id	Pull that imported the trade



The pull\_run\_id creates the relationship between a trade and the pull that imported it.



9\. Failure Handling



The backend handles several failure cases.



Duplicate Pull



Only one pull can run at a time.



If another pull is requested while one is already running:



HTTP 409 Conflict



is returned.



Stale Pull



If the backend stops while a pull is marked as running, the next server startup checks for stale running pulls and marks them as failed.



BSE API Failure



If a BSE API request fails, the current pull is marked as:



failed



with a completion timestamp.



10\. Design Summary



The architecture separates responsibilities:



Mock BSE API

&#x20;    │

&#x20;    │ Provides external trade data

&#x20;    ▼

Pull Service

&#x20;    │

&#x20;    │ Handles background ingestion

&#x20;    ▼

SQLite

&#x20;    │

&#x20;    │ Persistent trade storage

&#x20;    ▼

WebSocket

&#x20;    │

&#x20;    │ Pushes real-time updates

&#x20;    ▼

Next.js Dashboard



The main design goal is to avoid holding a single long-running HTTP request open while still providing incremental and real-time visibility of the incoming trade data.

