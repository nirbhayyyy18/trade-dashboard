"use client";

import { useEffect, useState } from "react";

interface Trade {
  id?: number;
  tradeId: string;
  client: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
  pullRunId: number | null;
}

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullStatus, setPullStatus] = useState("Ready");
  const [pullProgress, setPullProgress] = useState(0);
  const [pullStarting, setPullStarting] = useState(false);

  useEffect(() => {
    async function loadTrades() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/trades"
        );

        if (!response.ok) {
          throw new Error("Failed to load trades");
        }

        const data = await response.json();
        setTrades(data.trades);
      } catch (error) {
        console.error("Failed to load trades:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, []);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:5000/ws");

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.event === "trades-updated") {
          const { pullId, trades: incomingTrades, processed, total } =
            message.data;

          setPullStatus("Running");
          setPullProgress(Math.round((processed / total) * 100));

          setTrades((currentTrades) => {
            const tradeMap = new Map(
              currentTrades.map((trade) => [
                trade.tradeId,
                trade,
              ])
            );

            for (const trade of incomingTrades) {
              tradeMap.set(trade.tradeId, {
                ...trade,
                pullRunId: pullId,
              });
            }

            return Array.from(tradeMap.values()).sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );
          });
        }

        if (message.event === "pull-completed") {
          setPullStatus("Completed");
          setPullProgress(100);
          setPullStarting(false);
        }
      } catch (error) {
        console.error(
          "Failed to process WebSocket message:",
          error
        );
      }
    };

    socket.onerror = () => {
      console.warn("WebSocket connection interrupted");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  async function startPull() {
    try {
      setPullStarting(true);
      setPullStatus("Starting");
      setPullProgress(0);

      const response = await fetch(
        "http://localhost:5000/api/pulls",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.message || "Failed to start pull"
        );
      }

      const data = await response.json();

      console.log("Pull started:", data);
      setPullStatus("Running");
    } catch (error) {
      console.error("Failed to start pull:", error);
      setPullStatus("Failed");
      setPullStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">
            BSE Trades Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Real-time trade monitoring dashboard
          </p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total Trades
            </p>

            <p className="mt-2 text-3xl font-bold">
              {trades.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Pull Status
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pullStatus}
            </p>

            {pullStatus === "Running" && (
              <>
                <p className="mt-1 text-sm text-slate-400">
                  {pullProgress}% complete
                </p>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${pullProgress}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Connection
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              Online
            </p>
          </div>
        </section>

        <section className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Trades
            </h2>

            <p className="text-sm text-slate-400">
              Latest pulled trades
            </p>
          </div>

          <button
            type="button"
            onClick={startPull}
            disabled={
              pullStarting || pullStatus === "Running"
            }
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pullStarting || pullStatus === "Running"
              ? "Pulling..."
              : "Start Pull"}
          </button>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950">
                <tr>
                  <th className="px-5 py-4">Trade ID</th>
                  <th className="px-5 py-4">Client</th>
                  <th className="px-5 py-4">Symbol</th>
                  <th className="px-5 py-4">Quantity</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Loading trades...
                    </td>
                  </tr>
                ) : trades.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No trades available
                    </td>
                  </tr>
                ) : (
                  trades.map((trade) => (
                    <tr
                      key={trade.tradeId}
                      className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4 font-medium">
                        {trade.tradeId}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {trade.client}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {trade.symbol}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {trade.quantity.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        ₹{trade.price.toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {new Date(
                          trade.timestamp
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}