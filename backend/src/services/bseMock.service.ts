import { Trade } from "../types/trade";

const clients = [
  "ABC Securities",
  "XYZ Capital",
  "PQR Investments",
  "Alpha Broking",
  "Nova Capital",
  "Prime Securities",
];

const symbols = [
  "TCS",
  "INFY",
  "RELIANCE",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "ITC",
  "LT",
  "WIPRO",
  "TATASTEEL",
];

function createTrade(index: number): Trade {
  return {
    tradeId: `TRD-${String(index + 1).padStart(6, "0")}`,
    client: clients[index % clients.length],
    symbol: symbols[index % symbols.length],
    quantity: ((index % 20) + 1) * 50,
    price: Number((100 + ((index * 17.35) % 2500)).toFixed(2)),
    timestamp: new Date(
      Date.now() - (3000 - index) * 1000
    ).toISOString(),
  };
}

export function getSeededTrades(count = 3000): Trade[] {
  return Array.from({ length: count }, (_, index) =>
    createTrade(index)
  );
}