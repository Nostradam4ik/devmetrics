'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

export type WsEventType =
  | 'connected'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'new_insight'
  | 'new_commits'
  | 'pr_merged'
  | 'team_member_joined'
  | 'metrics_updated'
  | 'presence_join'
  | 'presence_leave'
  | 'ping';

export interface WsMessage {
  type: WsEventType;
  data?: Record<string, unknown>;
  org_id?: string;
  timestamp?: string;
}

type MessageHandler = (message: WsMessage) => void;

interface UseWebSocketOptions {
  orgId: string | null;
  onMessage?: MessageHandler;
  autoReconnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  onlineUsers: string[];
  send: (data: object) => void;
}

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL?.replace(/^http/, 'ws') ??
  'ws://localhost:8001';

const MAX_RECONNECT_DELAY = 30_000;

export function useWebSocket({
  orgId,
  onMessage,
  autoReconnect = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const mountedRef = useRef(true);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const connect = useCallback(() => {
    if (!orgId) return;
    const token = getAccessToken();
    if (!token) return;

    const url = `${WS_BASE_URL}/api/v1/ws?token=${encodeURIComponent(token)}&org_id=${encodeURIComponent(orgId)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // reset backoff
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg: WsMessage = JSON.parse(event.data);

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (msg.type === 'connected' || msg.type === 'presence_join' || msg.type === 'presence_leave') {
          const users = (msg.data?.online_users as string[]) ?? [];
          setOnlineUsers(users);
        }

        onMessage?.(msg);
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;

      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, reconnectDelayRef.current);

        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY
        );
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [orgId, onMessage, autoReconnect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, onlineUsers, send };
}
