import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  userId: string;
}

const typeIcon: Record<string, string> = {
  session_deleted: '🗑️',
  session_terminated: '🚫',
  warning: '⚠️',
  system: '📢',
};

export default function NotificationBell({ userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [muteBanner, setMuteBanner] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ─── Fetch initial data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const [notifRes, countRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/notifications/unread-count')
        ]);
        setNotifications(notifRes.data);
        setUnreadCount(countRes.data.count);
      } catch (_) {}
    };

    fetchNotifications();
  }, [userId]);

  // ─── Socket.IO setup ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join_user_room', userId);

    socket.on('new_notification', (data: { type: string; message: string }) => {
      const newNotif: Notification = {
        id: Date.now().toString(),
        type: data.type,
        message: data.message,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(c => c + 1);
    });

    socket.on('user_muted', (data: { message: string; reason?: string; expiresAt?: string }) => {
      setMuteBanner(data.message);
      setTimeout(() => setMuteBanner(null), 8000);
    });

    return () => { socket.disconnect(); };
  }, [userId]);

  // ─── Click-outside to close ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Mute Banner */}
      {muteBanner && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#f59e0b', color: '#000', padding: '10px 20px', borderRadius: 8,
          fontWeight: 600, fontSize: 13, zIndex: 3000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          🔇 {muteBanner}
        </div>
      )}

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'relative', background: 'transparent', border: 'none',
          cursor: 'pointer', fontSize: 22, color: '#e2e8f0', padding: '4px 8px',
          display: 'flex', alignItems: 'center'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: 'white', borderRadius: '50%',
            fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320, background: '#1e293b', border: '1px solid #334155',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #334155' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                You're all caught up! 🎉
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead(n.id); }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #1e293b',
                    background: n.isRead ? 'transparent' : 'rgba(59,130,246,0.08)',
                    cursor: n.isRead ? 'default' : 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start'
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {typeIcon[n.type] || '📢'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>{n.message}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
