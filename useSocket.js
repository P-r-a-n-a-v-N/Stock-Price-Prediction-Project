// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { getSocket, subscribeToTicker, unsubscribeFromTicker, subscribeToJob } from '../services/socket';

/**
 * Subscribe to real-time prediction updates for a ticker.
 * Automatically un-subscribes on cleanup or ticker change.
 */
export function useTickerSocket(ticker, onPrediction) {
  useEffect(() => {
    if (!ticker) return;

    const socket = getSocket();
    subscribeToTicker(ticker);

    socket.on('prediction:new', onPrediction);

    return () => {
      socket.off('prediction:new', onPrediction);
      unsubscribeFromTicker(ticker);
    };
  }, [ticker, onPrediction]);
}

/**
 * Subscribe to training job progress updates via WebSocket.
 * Calls onProgress(status) on every update.
 * Auto-cleans up when jobId changes or component unmounts.
 */
export function useJobSocket(jobId, onProgress) {
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!jobId) return;

    const socket = getSocket();
    subscribeToJob(jobId);

    function handler(status) {
      onProgressRef.current(status);
    }

    socket.on('job:progress', handler);
    return () => socket.off('job:progress', handler);
  }, [jobId]);
}
