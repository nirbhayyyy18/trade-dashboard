import db from "../db/database";
import { broadcast } from "./websocket.service";

interface BseResponse {
  success: boolean;
  count: number;
  total: number;
  offset: number;
  limit: number;
  trades: Array<{
    tradeId: string;
    client: string;
    symbol: string;
    quantity: number;
    price: number;
    timestamp: string;
  }>;
}

const BATCH_SIZE = Number(process.env.PULL_BATCH_SIZE || 500);
const PULL_DELAY_MS = Number(process.env.PULL_DELAY_MS || 5000);

interface PullRun {
  id: number;
  status: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function recoverStalePulls() {
  const result = db
    .prepare(`
      UPDATE pull_runs
      SET status = ?, completed_at = ?
      WHERE status = ?
    `)
    .run(
      "failed",
      new Date().toISOString(),
      "running"
    );

  if (result.changes > 0) {
    console.log(
      `Recovered ${result.changes} stale pull(s)`
    );
  }
}

function hasRunningPull() {
  const pull = db
    .prepare(`
      SELECT id
      FROM pull_runs
      WHERE status = ?
      LIMIT 1
    `)
    .get("running");

  return Boolean(pull);
}

function createPullRun(): PullRun {
  const result = db
    .prepare(`
      INSERT INTO pull_runs (status, started_at)
      VALUES (?, ?)
    `)
    .run("running", new Date().toISOString());

  return {
    id: Number(result.lastInsertRowid),
    status: "running",
  };
}

function insertTrades(
  trades: BseResponse["trades"],
  pullRunId: number
) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO trades (
      trade_id,
      client,
      symbol,
      quantity,
      price,
      timestamp,
      pull_run_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBatch = db.transaction(() => {
    for (const trade of trades) {
      insert.run(
        trade.tradeId,
        trade.client,
        trade.symbol,
        trade.quantity,
        trade.price,
        trade.timestamp,
        pullRunId
      );
    }
  });

  insertBatch();
}

async function fetchBseTrades(
    offset: number,
    limit: number
) {
  const baseUrl =
    process.env.BSE_API_URL || "http://localhost:5000";

  const url = new URL(
    `${baseUrl}/getTrades`
  );

  url.searchParams.set(
    "offset",
    String(offset)
  );

  url.searchParams.set(
    "limit",
    String(limit)
  );

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `BSE API returned ${response.status}`
    );
  }

  const data = (await response.json()) as BseResponse;

  if (!data.success) {
    throw new Error("BSE API request failed");
  }

  return data;
}

async function runPull(pullRunId: number) {
  try {
    console.log(`Pull ${pullRunId} started`);

    let offset = 0;
    let total = 0;

    while (true) {
      const data = await fetchBseTrades(
        offset,
        BATCH_SIZE
      );

      const batch = data.trades;

      if (batch.length === 0) {
        break;
      }

      insertTrades(batch, pullRunId);

      total += batch.length;

      console.log(
        `Pull ${pullRunId}: ${total}/${data.total}`
      );

      broadcast("trades-updated", {
        pullId: pullRunId,
        trades: batch,
        batchSize: batch.length,
        processed: total,
        total: data.total,
      });

      offset += batch.length;

      if (total >= data.total) {
        break;
      }

      await sleep(PULL_DELAY_MS);
    }

    db.prepare(`
      UPDATE pull_runs
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(
      "completed",
      new Date().toISOString(),
      pullRunId
    );

    broadcast("pull-completed", {
      pullId: pullRunId,
      total,
    });

    console.log(`Pull ${pullRunId} completed`);
  } catch (error) {
    console.error(
      `Pull ${pullRunId} failed:`,
      error
    );

    db.prepare(`
      UPDATE pull_runs
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(
      "failed",
      new Date().toISOString(),
      pullRunId
    );
  }
}

export function startTradePull(): PullRun {
  if (hasRunningPull()) {
    throw new Error(
      "A trade pull is already running"
    );
  }

  const pull = createPullRun();

  void runPull(pull.id);

  return pull;
}