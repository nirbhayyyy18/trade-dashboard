import { Router } from "express";
import { startTradePull } from "../services/pull.service";

const router = Router();

router.post("/pulls", (_req, res) => {
  try {
    const pull = startTradePull();

    return res.status(202).json({
      success: true,
      pullId: pull.id,
      status: pull.status,
      message: "Trade pull started",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "A trade pull is already running"
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Failed to start pull:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start trade pull",
    });
  }
});

export default router;