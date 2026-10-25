'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export function NetworkStatusNotifier() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    // Initial status check
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);

      // Check Network Information API if supported
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        const updateNetworkQuality = () => {
          if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.rtt > 800) {
            setIsSlow(true);
          } else {
            setIsSlow(false);
          }
        };

        updateNetworkQuality();
        conn.addEventListener('change', updateNetworkQuality);
        return () => conn.removeEventListener('change', updateNetworkQuality);
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setReconnected(true);
      const timer = setTimeout(() => setReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !isSlow && !reconnected) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[99] max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {/* OFFLINE BANNER */}
      {isOffline && (
        <div className="bg-red-900/95 backdrop-blur text-white p-3.5 rounded-2xl shadow-2xl border border-red-700/60 flex items-center justify-between gap-3 pointer-events-auto animate-bounce-short">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-800 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-red-200 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">You are Offline</p>
              <p className="text-[11px] text-red-200 truncate">Check internet connection. Data may be cached.</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 hover:bg-red-800 rounded-lg text-red-200 hover:text-white transition shrink-0"
            title="Retry Connection"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* RECONNECTED BANNER */}
      {reconnected && !isOffline && (
        <div className="bg-emerald-950/95 backdrop-blur text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-700/60 flex items-center gap-2.5 pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs font-bold">Back Online</p>
            <p className="text-[11px] text-emerald-200">Internet connection restored successfully.</p>
          </div>
        </div>
      )}

      {/* SLOW CONNECTION WARNING */}
      {isSlow && !isOffline && !reconnected && (
        <div className="bg-amber-950/95 backdrop-blur text-amber-100 p-3.5 rounded-2xl shadow-2xl border border-amber-700/60 flex items-center gap-2.5 pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-amber-800 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold">Slow Internet Connection</p>
            <p className="text-[11px] text-amber-200">Page loading might take a little extra time...</p>
          </div>
        </div>
      )}
    </div>
  );
}
