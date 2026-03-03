'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useWebSocket, WsMessage } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';

export interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  onlineUsers: string[];
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  onlineUsers: [],
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
});

const MAX_NOTIFICATIONS = 50;

function buildNotification(msg: WsMessage): Notification | null {
  const ts = msg.timestamp ?? new Date().toISOString();
  const data = msg.data ?? {};

  switch (msg.type) {
    case 'sync_started':
      return {
        id: `${ts}-sync-started`,
        type: 'sync',
        title: 'Sync started',
        description: `Syncing repository "${data.repo}"…`,
        timestamp: ts,
        read: false,
      };
    case 'sync_completed':
      return {
        id: `${ts}-sync-completed`,
        type: 'sync',
        title: 'Sync complete',
        description: `"${data.repo}" synced — ${data.commits_added} new commits.`,
        timestamp: ts,
        read: false,
      };
    case 'sync_failed':
      return {
        id: `${ts}-sync-failed`,
        type: 'error',
        title: 'Sync failed',
        description: `Error syncing "${data.repo}": ${data.error}`,
        timestamp: ts,
        read: false,
      };
    case 'new_insight':
      return {
        id: `${ts}-insight`,
        type: 'insight',
        title: 'New AI insight',
        description: String(data.title ?? 'A new insight is available.'),
        timestamp: ts,
        read: false,
      };
    case 'metrics_updated':
      return {
        id: `${ts}-metrics`,
        type: 'metrics',
        title: 'Metrics updated',
        description: 'Dashboard metrics have been refreshed.',
        timestamp: ts,
        read: false,
      };
    case 'team_member_joined':
      return {
        id: `${ts}-team`,
        type: 'team',
        title: 'New team member',
        description: `${data.email ?? 'Someone'} joined your organization.`,
        timestamp: ts,
        read: false,
      };
    default:
      return null;
  }
}

interface Props {
  children: React.ReactNode;
  orgId: string | null;
}

export function NotificationProvider({ children, orgId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (msg: WsMessage) => {
      // Invalidate relevant React Query caches on real-time events
      if (msg.type === 'metrics_updated' || msg.type === 'sync_completed') {
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
      }
      if (msg.type === 'new_insight') {
        queryClient.invalidateQueries({ queryKey: ['insights'] });
      }
      if (msg.type === 'team_member_joined') {
        queryClient.invalidateQueries({ queryKey: ['team'] });
      }

      const notification = buildNotification(msg);
      if (!notification) return;

      setNotifications((prev) => {
        const updated = [notification, ...prev];
        return updated.slice(0, MAX_NOTIFICATIONS);
      });
    },
    [queryClient]
  );

  const { isConnected, onlineUsers } = useWebSocket({
    orgId,
    onMessage: handleMessage,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        onlineUsers,
        markAllRead,
        markRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
