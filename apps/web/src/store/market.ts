import { create } from 'zustand';
import type { Quote } from '@psx/shared';
import type { MarketSnapshot } from '../lib/types';

interface MarketState {
  connected: boolean;
  snapshot: MarketSnapshot | null;
  quotes: Record<string, Quote>;
  prevPrices: Record<string, number>;
  setConnected: (c: boolean) => void;
  applyUpdate: (snap: MarketSnapshot & { quotes?: Quote[] }) => void;
}

export const useMarket = create<MarketState>((set) => ({
  connected: false,
  snapshot: null,
  quotes: {},
  prevPrices: {},
  setConnected: (connected) => set({ connected }),
  applyUpdate: (snap) =>
    set((state) => {
      if (!snap.quotes) return { snapshot: snap };
      const prevPrices: Record<string, number> = {};
      const quotes: Record<string, Quote> = {};
      for (const q of snap.quotes) {
        prevPrices[q.symbol] = state.quotes[q.symbol]?.price ?? q.price;
        quotes[q.symbol] = q;
      }
      const { quotes: _q, ...rest } = snap;
      return { snapshot: rest, quotes, prevPrices };
    }),
}));
