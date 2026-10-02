import { Router } from "express";
import { getSeededTrades } from "../services/bseMock.service";

const router = Router();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.get("/getTrades", async (req, res) => {
  const offset = Number(req.query.offset || 0);
  const limit = Number(req.query.limit || 500);
  const delay = Number(
    req.query.delayMs ??
      process.env.BSE_API_DELAY_MS ??
      1000
  );

  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid offset or limit",
    });
  }

  if (delay < 0 || delay > 900000) {
    return res.status(400).json({
      success: false,
      message: "delayMs must be between 0 and 900000",
    });
  }

  const trades = getSeededTrades(3000);
  const batch = trades.slice(offset, offset + limit);

  await sleep(delay);

  return res.json({
    success: true,
    count: batch.length,
    total: trades.length,
    offset,
    limit,
    trades: batch,
  });
});

export default router;