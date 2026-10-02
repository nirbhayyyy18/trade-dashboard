import { Request, Response } from "express";
import db from "../db/database";

export function getTrades(_req: Request, res: Response) {
  try {
    const trades = db
      .prepare(`
        SELECT
          id,
          trade_id AS tradeId,
          client,
          symbol,
          quantity,
          price,
          timestamp,
          pull_run_id AS pullRunId
        FROM trades
        ORDER BY timestamp DESC
      `)
      .all();

    return res.json({
      success: true,
      count: trades.length,
      trades,
    });
  } catch (error) {
    console.error("Failed to fetch trades:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trades",
    });
  }
}