import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Quote } from '@psx/shared';
import { useMarket } from '../store/market';
import type { MarketSnapshot } from '../lib/types';

let socket: Socket | null = null;

/**
 * Connect to the API's socket.io stream once (shared singleton) and pipe
 * quote/status events into the market store. Connects same-origin so the Vite
 * dev proxy (and nginx in prod) forward to the API.
 */
export function useMarketSocket(): void {
  const { setConnected, applyUpdate } = useMarket();

  useEffect(() => {
    if (!socket) socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    const s = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdate = (snap: MarketSnapshot & { quotes?: Quote[] }) => applyUpdate(snap);
    const onStatus = (snap: MarketSnapshot) => applyUpdate(snap);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('quotes:update', onUpdate);
    s.on('quotes:status', onStatus);
    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('quotes:update', onUpdate);
      s.off('quotes:status', onStatus);
    };
  }, [setConnected, applyUpdate]);
}
