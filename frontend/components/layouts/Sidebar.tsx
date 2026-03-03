'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import { LiveSyncStatus } from '@/components/ui/live-sync-status';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'chart' },
  { name: 'Team', href: '/dashboard/team', icon: 'users' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: 'bar-chart' },
  { name: 'AI Insights', href: '/dashboard/insights', icon: 'sparkles' },
  { name: 'ML Insights', href: '/dashboard/ml-insights', icon: 'brain' },
  { name: 'Reports', href: '/dashboard/reports', icon: 'file-text' },
  { name: 'Integrations', href: '/dashboard/integrations', icon: 'plug' },
  { name: 'Repositories', href: '/dashboard/repositories', icon: 'git-branch' },
  { name: 'Settings', href: '/dashboard/settings', icon: 'settings' },
];

const iconMap: Record<string, string> = {
  chart: 'M3 3v18h18M9 17V9m4 8V5m4 12v-6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  'bar-chart': 'M12 20V10M18 20V4M6 20v-4',
  sparkles: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
  'file-text': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  plug: 'M12 22v-5M9 8V2M15 8V2M18 8H6a1 1 0 0 0-1 1v4a6 6 0 0 0 12 0V9a1 1 0 0 0-1-1Z',
  'git-branch': 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9',
  brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2ZM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const path = iconMap[icon] || '';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

function PresenceAvatars({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.min(count - 1, 3) }).map((_, i) => (
        <span
          key={i}
          className="h-5 w-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white"
          style={{ marginLeft: i > 0 ? '-6px' : 0 }}
        />
      ))}
      {count - 1 > 3 && (
        <span className="text-xs text-gray-400 ml-1">+{count - 4}</span>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isConnected, onlineUsers } = useNotifications();

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold">DevMetrics</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <NavIcon icon={item.icon} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          {/* Online presence */}
          {onlineUsers.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {onlineUsers.length} online
              </span>
              <PresenceAvatars count={onlineUsers.length} />
            </div>
          )}
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-gray-300'
              }`}
            />
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <div className="text-xs text-gray-400">2026 DevMetrics</div>
        </div>
      </div>
      {/* Live sync toast — rendered outside sidebar to avoid overflow clipping */}
      <LiveSyncStatus />
    </>
  );
}
