'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import type { WsEventType } from '@/hooks/useWebSocket';

interface SyncState {
  repo: string;
  status: 'syncing' | 'done' | 'error';
  message: string;
}

export function LiveSyncStatus() {
  const { notifications, isConnected } = useNotifications();
  const [syncState, setSyncState] = useState<SyncState | null>(null);

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];

    if (latest.type === 'sync') {
      if (latest.title === 'Sync started') {
        const repo = latest.description.replace("Syncing repository \"", '').replace('\"…', '');
        setSyncState({ repo, status: 'syncing', message: latest.description });
        return;
      }
      if (latest.title === 'Sync complete') {
        setSyncState((prev) =>
          prev ? { ...prev, status: 'done', message: latest.description } : null
        );
        // Auto-dismiss after 4s
        setTimeout(() => setSyncState(null), 4000);
        return;
      }
    }
    if (latest.type === 'error') {
      setSyncState((prev) =>
        prev ? { ...prev, status: 'error', message: latest.description } : null
      );
      setTimeout(() => setSyncState(null), 6000);
    }
  }, [notifications]);

  if (!syncState) return null;

  const colors = {
    syncing: 'bg-blue-50 border-blue-200 text-blue-700',
    done: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-md text-sm transition-all ${colors[syncState.status]}`}
    >
      {syncState.status === 'syncing' && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      )}
      {syncState.status === 'done' && (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {syncState.status === 'error' && (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <span>{syncState.message}</span>
      <button
        onClick={() => setSyncState(null)}
        className="ml-1 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
