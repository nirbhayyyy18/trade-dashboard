import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

import bseRouter from "./routes/bse.routes";
import pullsRouter from "./routes/pulls.routes";
import tradesRouter from "./routes/trades.routes";
import { recoverStalePulls } from "./services/pull.service";
import { addClient } from "./services/websocket.service";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Trade Dashboard API is running",
  });
});

app.use("/api", tradesRouter);
app.use("/api", pullsRouter);
app.use("/", bseRouter);

recoverStalePulls();

const server = app.listen(port, () => {
  console.log(
    `Backend running at http://localhost:${port}`
  );
});

const websocketServer = new WebSocketServer({
  server,
  path: "/ws",
});

websocketServer.on("connection", (socket) => {
  addClient(socket);

  socket.send(
    JSON.stringify({
      event: "connected",
      data: {
        message: "WebSocket connection established",
      },
    })
  );
});