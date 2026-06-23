import type { Server as HttpServer } from 'node:http';
import { Server as IoServer } from 'socket.io';
import type { QuoteService } from './quote-service.js';

export interface RealtimeHandle {
  io: IoServer;
  stop: () => Promise<void>;
}

/**
 * Attach a socket.io server and poll the QuoteService on an interval. After each
 * refresh, push the new quotes + freshness status to every connected client.
 * New clients get an immediate snapshot on connect.
 */
export function startRealtime(
  server: HttpServer,
  quotes: QuoteService,
  opts: { intervalMs: number; corsOrigin: string }
): RealtimeHandle {
  const io = new IoServer(server, { cors: { origin: opts.corsOrigin } });

  io.on('connection', (socket) => {
    socket.emit('quotes:update', { ...quotes.snapshot(), quotes: quotes.quotesList() });
  });

  const tick = async (): Promise<void> => {
    try {
      const changed = await quotes.refresh();
      if (changed) {
        io.emit('quotes:update', { ...quotes.snapshot(), quotes: quotes.quotesList() });
      } else {
        io.emit('quotes:status', quotes.snapshot());
      }
    } catch {
      io.emit('quotes:status', quotes.snapshot());
    }
  };

  const timer = setInterval(() => void tick(), opts.intervalMs);
  void tick(); // prime immediately

  return {
    io,
    stop: async () => {
      clearInterval(timer);
      await io.close();
    },
  };
}
