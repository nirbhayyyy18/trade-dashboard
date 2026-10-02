import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function addClient(client: WebSocket) {
  clients.add(client);

  console.log(`WebSocket client connected (${clients.size})`);

  client.on("close", () => {
    clients.delete(client);

    console.log(
      `WebSocket client disconnected (${clients.size})`
    );
  });
}

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({
    event,
    data,
  });

  let sent = 0;

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

console.log(
    `broadcast ${event} to ${sent} client(s)`
);
}