'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

type Notification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  project: { id: string; name: string } | null;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/notifications').then((r) => r.data),
    refetchInterval: 30000, // poll every 30s so new ones show without a manual refresh
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });


  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded hover:bg-parchment/10 text-parchment"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 bg-white text-espresso rounded shadow-lg border border-parchment/20 z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-parchment/20">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-espresso/60 hover:text-espresso"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <p className="text-xs text-espresso/50 p-4">No notifications yet.</p>
          )}

         {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-2 px-3 py-2 text-xs border-b border-parchment/10 hover:bg-parchment/10 ${
                n.isRead ? 'opacity-60' : 'font-medium'
              }`}
            >
              <button
                onClick={() => n.project && router.push(`/projects/${n.project.id}`)}
                className="flex-1 text-left"
              >
                {n.message}
              </button>
              {!n.isRead && (
                <button
                  onClick={() => markReadMutation.mutate(n.id)}
                  title="Mark as read"
                  className="text-espresso/50 hover:text-espresso shrink-0"
                >
                  ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}