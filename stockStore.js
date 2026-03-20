// frontend/src/store/stockStore.js
import { create } from 'zustand';
import api from '../services/api';

export const useStockStore = create((set, get) => ({
  // Current ticker state
  ticker: 'AAPL',
  horizon: 7,
  predictionData: null,
  stockData: null,
  isLoadingPrediction: false,
  isLoadingStock: false,
  predictionError: null,

  // Training jobs
  activeJobId: null,
  jobStatus: null,
  isTraining: false,

  // Watchlist
  watchlist: [],

  setTicker: (ticker) => set({ ticker: ticker.toUpperCase(), predictionData: null }),
  setHorizon: (horizon) => set({ horizon }),

  fetchPrediction: async () => {
    const { ticker, horizon } = get();
    set({ isLoadingPrediction: true, predictionError: null });
    try {
      const { data } = await api.get(`/predictions/${ticker}`, {
        params: { horizon },
      });
      set({ predictionData: data, isLoadingPrediction: false });
    } catch (err) {
      set({
        predictionError: err.response?.data?.error || 'Prediction failed',
        isLoadingPrediction: false,
      });
    }
  },

  fetchStockData: async (days = 365) => {
    const { ticker } = get();
    set({ isLoadingStock: true });
    try {
      const { data } = await api.get(`/stocks/${ticker}/data`, {
        params: { period_days: days },
      });
      set({ stockData: data, isLoadingStock: false });
    } catch (err) {
      set({ isLoadingStock: false });
    }
  },

  startTraining: async (epochs = 50) => {
    const { ticker, horizon } = get();
    set({ isTraining: true, activeJobId: null, jobStatus: null });
    try {
      const { data } = await api.post('/train/start', {
        ticker,
        horizon,
        epochs,
        batch_size: 32,
      });
      set({ activeJobId: data.jobId });
      return data.jobId;
    } catch (err) {
      set({ isTraining: false });
      throw err;
    }
  },

  updateJobStatus: (status) => {
    set({ jobStatus: status });
    if (['completed', 'failed'].includes(status.status)) {
      set({ isTraining: false });
    }
  },

  fetchWatchlist: async () => {
    try {
      const { data } = await api.get('/watchlist');
      set({ watchlist: data.tickers });
    } catch (_) {}
  },

  addToWatchlist: async (ticker) => {
    try {
      const { data } = await api.post('/watchlist', { ticker });
      set({ watchlist: data.tickers });
    } catch (_) {}
  },

  removeFromWatchlist: async (ticker) => {
    try {
      const { data } = await api.delete(`/watchlist/${ticker}`);
      set({ watchlist: data.tickers });
    } catch (_) {}
  },
}));
