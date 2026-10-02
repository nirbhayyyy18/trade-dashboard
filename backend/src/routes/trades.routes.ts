import { Router } from "express";
import { getTrades } from "../controllers/trades.controller";

const router = Router();

router.get("/trades", getTrades);

export default router;