import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  activeSessions: number;
  bannedUsers: number;
  toxicCount: number;
  toxicMessages: number;
}

interface LiveStats {
  activeSessions: number;
  connectedPlayers: number;
  deletedToday: number;
  notificationsSent: number;
}

interface AuditEntry {
  id: string;
  action: string;
  details: string;
  adminId: string;
  targetId?: string;
  createdAt: string;
  admin?: { username: string; role: string };
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  reputation: number;
  isBanned: boolean;
  toxicityFlags: number;
  eigenTrustScore: number;
  createdAt: string;
}

interface Session {
  id: string;
  title: string;
  status: string;
  currentPlayers: number;
  maxPlayers: number;
  createdAt: string;
  host?: { username: string };
  game?: { name: string };
}

interface DeletionLog {
  id: string;
  sessionTitle: string;
  deletedByRole: string;
  membersNotified: number;
  deletedAt: string;
  deletedByUser?: { username: string; role: string };
}

interface TrendPoint {
  date: string;
  flaggedMessages: number;
  toxicUsers: number;
}

interface Config {
  [key: string]: any;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
  purple: '#a855f7',
};

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 20,
};

const btnStyle = (bg = C.accent): React.CSSProperties => ({
  padding: '8px 16px',
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
});

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#0f172a',
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.text,
  fontSize: 13,
};

type Section = 'live' | 'users' | 'audit' | 'lfg' | 'config';

const ACTION_COLORS: Record<string, string> = {
  BAN_USER: '#ef4444',
  UNBAN_USER: '#22c55e',
  WARN_USER: '#f59e0b',
  MANUAL_REP: '#a855f7',
  HIRE_MOD: '#3b82f6',
  CHANGE_ROLE: '#06b6d4',
  DELETE_SESSION: '#f97316',
  RESET_REPUTATION: '#ec4899',
  TERMINATE_SESSION: '#dc2626',
  SHADOW_BAN: '#7c3aed',
  MUTE_USER: '#d97706',
  UPDATE_CONFIG: '#0891b2',
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [section, setSection] = useState<Section>('live');
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [realtimeFeed, setRealtimeFeed] = useState<AuditEntry[]>([]);

  // Users state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [resetReasonModal, setResetReasonModal] = useState<{ userId: string; username: string } | null>(null);
  const [resetReason, setResetReason] = useState('');

  // Audit state
  const [auditAction, setAuditAction] = useState('');
  const [auditStart, setAuditStart] = useState('');
  const [auditEnd, setAuditEnd] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // LFG state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deletionLog, setDeletionLog] = useState<DeletionLog[]>([]);
  const [showDeletionLog, setShowDeletionLog] = useState(false);

  // Config state
  const [configDraft, setConfigDraft] = useState<Config>({});

  // Create mod modal
  const [showCreateMod, setShowCreateMod] = useState(false);
  const [modForm, setModForm] = useState({ username: '', email: '', password: '' });

  // ─── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_admin');
    socket.on('admin_activity', (entry: AuditEntry) => {
      setRealtimeFeed(prev => [entry, ...prev].slice(0, 50));
    });
    socket.on('live_stats_update', (data: LiveStats) => {
      setLiveStats(data);
    });
    return () => { socket.disconnect(); };
  }, []);

  // ─── Data fetchers ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try { const r = await api.get('/admin/stats'); setStats(r.data); } catch (_) {}
  }, []);

  const fetchLiveStats = useCallback(async () => {
    try { const r = await api.get('/admin/stats/live'); setLiveStats(r.data); } catch (_) {}
  }, []);

  const fetchTrends = useCallback(async () => {
    try { const r = await api.get('/admin/stats/toxicity-trends'); setTrends(r.data); } catch (_) {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userRole) params.set('role', userRole);
      if (userStatus) params.set('status', userStatus);
      params.set('page', String(userPage));
      params.set('limit', '20');
      const r = await api.get(`/admin/users/all?${params}`);
      setUsers(r.data.users);
      setUserTotal(r.data.total);
      setUserTotalPages(r.data.totalPages);
    } catch (_) {}
  }, [userSearch, userRole, userStatus, userPage]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (auditAction) params.set('action', auditAction);
      if (auditStart) params.set('startDate', auditStart);
      if (auditEnd) params.set('endDate', auditEnd);
      params.set('page', String(auditPage));
      const r = await api.get(`/admin/audit-logs?${params}`);
      setAuditLog(r.data.logs);
      setAuditTotal(r.data.total);
    } catch (_) {}
  }, [auditAction, auditStart, auditEnd, auditPage]);

  const fetchSessions = useCallback(async () => {
    try { const r = await api.get('/admin/lfg/sessions'); setSessions(r.data); } catch (_) {}
  }, []);

  const fetchDeletionLog = useCallback(async () => {
    try { const r = await api.get('/admin/lfg/deletion-log'); setDeletionLog(r.data); } catch (_) {}
  }, []);

  const fetchConfig = useCallback(async () => {
    try { const r = await api.get('/admin/config'); setConfigDraft(r.data); } catch (_) {}
  }, []);

  // ─── Section loaders ───────────────────────────────────────────────────────
  useEffect(() => { fetchStats(); fetchLiveStats(); }, []);

  useEffect(() => {
    if (section === 'live') fetchTrends();
    if (section === 'users') fetchUsers();
    if (section === 'audit') fetchAuditLogs();
    if (section === 'lfg') fetchSessions();
    if (section === 'config') fetchConfig();
  }, [section]);

  useEffect(() => { if (section === 'users') fetchUsers(); }, [userSearch, userRole, userStatus, userPage]);
  useEffect(() => { if (section === 'audit') fetchAuditLogs(); }, [auditAction, auditStart, auditEnd, auditPage]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const banToggle = async (userId: string) => {
    try { await api.post(`/admin/ban/${userId}`); fetchUsers(); } catch (_) {}
  };

  const changeRole = async (userId: string, role: string) => {
    try { await api.patch(`/admin/users/${userId}/role`, { role }); fetchUsers(); } catch (_) {}
  };

  const resetRep = async () => {
    if (!resetReasonModal || !resetReason.trim()) return;
    try {
      await api.post(`/admin/users/${resetReasonModal.userId}/reset-reputation`, { reason: resetReason });
      setResetReasonModal(null);
      setResetReason('');
      fetchUsers();
    } catch (_) {}
  };

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try { await api.delete(`/lfg/sessions/${sessionId}`); fetchSessions(); } catch (_) {}
  };

  const saveConfig = async () => {
    try { await api.patch('/admin/config', configDraft); alert('Configuration saved!'); } catch (_) {}
  };

  const createMod = async () => {
    try {
      await api.post('/admin/create-moderator', modForm);
      setShowCreateMod(false);
      setModForm({ username: '', email: '', password: '' });
      alert('Moderator created!');
    } catch (_) {}
  };

  const exportCSV = () => {
    const rows = auditLog.map(l =>
      `"${l.createdAt}","${l.action}","${l.admin?.username || ''}","${(l.details || '').replace(/"/g, '""')}","${l.targetId || ''}"`
    );
    const csv = ['Date,Action,Admin,Details,Target', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audit_log.csv';
    a.click();
  };

  // ─── Sidebar nav items ─────────────────────────────────────────────────────
  const sideItems: { key: Section; label: string }[] = [
    { key: 'live', label: '📡 Live Traffic' },
    { key: 'users', label: '👥 User Management' },
    { key: 'audit', label: '📋 Audit Logs' },
    { key: 'lfg', label: '🎮 LFG Sessions' },
    { key: 'config', label: '⚙️ Fracture Config' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, minWidth: 220, background: C.card, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>🛡️ Admin</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>GameNexus Control Panel</div>
        </div>

        {stats && (
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Stats</div>
            {[
              { label: 'Total Users', value: stats.totalUsers, color: C.accent },
              { label: 'Active Sessions', value: stats.activeSessions, color: C.green },
              { label: 'Banned', value: stats.bannedUsers, color: C.red },
              { label: 'Toxic Msgs', value: stats.toxicMessages, color: C.yellow },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: C.muted }}>{s.label}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sideItems.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)} style={{
              padding: '10px 12px', textAlign: 'left',
              background: section === item.key ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: section === item.key ? C.accent : C.muted,
              border: section === item.key ? `1px solid rgba(59,130,246,0.4)` : '1px solid transparent',
              borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: section === item.key ? 600 : 400,
            }}>{item.label}</button>
          ))}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setShowCreateMod(true)} style={{ ...btnStyle(C.green), width: '100%', marginBottom: 8 }}>
            + Create Moderator
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ ...btnStyle('#475569'), width: '100%' }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

        {/* ── SECTION 1: LIVE TRAFFIC ─────────────────────────────── */}
        {section === 'live' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>📡 Live Traffic</h2>

            {liveStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                {[
                  { label: 'Active Sessions', value: liveStats.activeSessions, color: C.green },
                  { label: 'Connected Players', value: liveStats.connectedPlayers, color: C.accent },
                  { label: 'Sessions Deleted Today', value: liveStats.deletedToday, color: C.red },
                  { label: 'Notifications Sent Today', value: liveStats.notificationsSent, color: C.yellow },
                ].map(s => (
                  <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Toxicity Trends (7 Days)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
                  <Legend />
                  <Line type="monotone" dataKey="flaggedMessages" stroke={C.red} name="Flagged Messages" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="toxicUsers" stroke={C.yellow} name="Toxic Users" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🔴 Live Activity Feed</h3>
              {realtimeFeed.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 13 }}>Waiting for activity... (updates in real-time via Socket.IO)</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {realtimeFeed.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 6 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: ACTION_COLORS[entry.action] || '#475569', color: 'white', whiteSpace: 'nowrap' }}>
                        {entry.action}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, color: C.muted }}>{entry.details}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 2: USER MANAGEMENT ──────────────────────────── */}
        {section === 'users' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>👥 User Management</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 200 }} placeholder="Search username or email..."
                value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }} />
              <select value={userRole} onChange={e => { setUserRole(e.target.value); setUserPage(1); }} style={inputStyle}>
                <option value="">All Roles</option>
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select value={userStatus} onChange={e => { setUserStatus(e.target.value); setUserPage(1); }} style={inputStyle}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
              {userTotal} users · Page {userPage} of {userTotalPages}
            </div>

            <div style={{ ...cardStyle, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Username', 'Email', 'Role', 'Rep', 'Flags', 'Trust', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: C.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.username}</td>
                      <td style={{ padding: '10px 12px', color: C.muted, fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: u.role === 'ADMIN' ? '#7c3aed' : u.role === 'MODERATOR' ? '#0891b2' : '#475569', color: 'white' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: u.reputation < 30 ? C.red : u.reputation < 60 ? C.yellow : C.green, fontWeight: 600 }}>
                        {u.reputation}
                      </td>
                      <td style={{ padding: '10px 12px', color: u.toxicityFlags > 0 ? C.red : C.muted }}>{u.toxicityFlags}</td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{u.eigenTrustScore?.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: u.isBanned ? C.red : C.green, fontWeight: 600 }}>
                          {u.isBanned ? '🚫 Banned' : '✅ Active'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => banToggle(u.id)} style={btnStyle(u.isBanned ? C.green : C.red)}>
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          {u.role === 'USER' && (
                            <button onClick={() => changeRole(u.id, 'MODERATOR')} style={btnStyle('#0891b2')}>Promote</button>
                          )}
                          {u.role === 'MODERATOR' && (
                            <button onClick={() => changeRole(u.id, 'USER')} style={btnStyle('#475569')}>Demote</button>
                          )}
                          <button onClick={() => setResetReasonModal({ userId: u.id, username: u.username })} style={btnStyle(C.purple)}>
                            Reset Rep
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)} style={btnStyle('#475569')}>← Prev</button>
              <span style={{ padding: '8px 16px', color: C.muted, fontSize: 13 }}>Page {userPage}</span>
              <button disabled={userPage >= userTotalPages} onClick={() => setUserPage(p => p + 1)} style={btnStyle('#475569')}>Next →</button>
            </div>
          </div>
        )}

        {/* ── SECTION 3: AUDIT LOGS ───────────────────────────────── */}
        {section === 'audit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>📋 Audit Logs</h2>
              <button onClick={exportCSV} style={btnStyle(C.green)}>⬇ Export CSV</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Filter by action (e.g. BAN_USER)..."
                value={auditAction} onChange={e => { setAuditAction(e.target.value); setAuditPage(1); }} />
              <input type="date" style={inputStyle} value={auditStart} onChange={e => { setAuditStart(e.target.value); setAuditPage(1); }} />
              <input type="date" style={inputStyle} value={auditEnd} onChange={e => { setAuditEnd(e.target.value); setAuditPage(1); }} />
            </div>

            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{auditTotal} entries</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {auditLog.map(log => (
                <div key={log.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, minWidth: 130, textAlign: 'center',
                    background: ACTION_COLORS[log.action] || '#475569', color: 'white', whiteSpace: 'nowrap' }}>
                    {log.action}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>{log.details}</span>
                  <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>
                    by <strong>{log.admin?.username || log.adminId.slice(0, 8)}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {auditLog.length === 0 && <p style={{ color: C.muted }}>No logs found.</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <button disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)} style={btnStyle('#475569')}>← Prev</button>
              <span style={{ padding: '8px 16px', color: C.muted, fontSize: 13 }}>Page {auditPage}</span>
              <button onClick={() => setAuditPage(p => p + 1)} style={btnStyle('#475569')}>Next →</button>
            </div>
          </div>
        )}

        {/* ── SECTION 4: LFG SESSIONS ─────────────────────────────── */}
        {section === 'lfg' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>🎮 LFG Sessions</h2>
              <button onClick={() => { setShowDeletionLog(true); fetchDeletionLog(); }} style={btnStyle('#475569')}>
                📜 Deletion Log
              </button>
            </div>

            <div style={{ ...cardStyle, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Title', 'Host', 'Game', 'Players', 'Status', 'Created', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: C.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.title}</td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{s.host?.username || '—'}</td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{s.game?.name || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{s.currentPlayers}/{s.maxPlayers}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: s.status === 'OPEN' ? C.green : s.status === 'CLOSED' ? C.red : '#475569', color: 'white' }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: C.muted }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {s.status === 'OPEN' && (
                          <button onClick={() => deleteSession(s.id)} style={btnStyle(C.red)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessions.length === 0 && <p style={{ color: C.muted, padding: 16 }}>No sessions.</p>}
            </div>
          </div>
        )}

        {/* ── SECTION 5: FRACTURE CONFIG ──────────────────────────── */}
        {section === 'config' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>⚙️ Fracture Algorithm Config</h2>
              <button onClick={saveConfig} style={btnStyle(C.green)}>💾 Save Changes</button>
            </div>

            <div style={{ ...cardStyle, maxWidth: 600 }}>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
                Configure the Fracture behavioral matchmaking algorithm. Changes take effect immediately.
              </p>

              {[
                { key: 'behaviorWeight', label: 'Behavior Weight (0–1)', min: 0, max: 1, step: 0.05, def: 0.7 },
                { key: 'trustWeight', label: 'Trust Weight (0–1)', min: 0, max: 1, step: 0.05, def: 0.3 },
                { key: 'minCompatibilityThreshold', label: 'Min Compatibility Threshold', min: 0, max: 1, step: 0.05, def: 0.4 },
                { key: 'maxMatchResults', label: 'Max Match Results', min: 5, max: 50, step: 5, def: 20 },
                { key: 'toxicityPenaltyMultiplier', label: 'Toxicity Penalty Multiplier', min: 0.5, max: 3, step: 0.1, def: 1.5 },
              ].map(field => {
                const val = configDraft[field.key] ?? field.def;
                return (
                  <div key={field.key} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>{field.label}</label>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>{val}</span>
                    </div>
                    <input type="range" min={field.min} max={field.max} step={field.step} value={val}
                      onChange={e => setConfigDraft(d => ({ ...d, [field.key]: parseFloat(e.target.value) }))}
                      style={{ width: '100%', accentColor: C.accent }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: 4 }}>
                      <span>{field.min}</span><span>{field.max}</span>
                    </div>
                  </div>
                );
              })}

              {[
                { key: 'shadowBanEnabled', label: 'Shadow-Ban Enforcement', desc: 'Silently block shadow-banned users from joining sessions' },
                { key: 'aiDetectionEnabled', label: 'AI Toxicity Detection', desc: 'Enable real-time AI message analysis' },
              ].map(toggle => (
                <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{toggle.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{toggle.desc}</div>
                  </div>
                  <button
                    onClick={() => setConfigDraft(d => ({ ...d, [toggle.key]: !d[toggle.key] }))}
                    style={btnStyle(configDraft[toggle.key] !== false ? C.green : '#475569')}>
                    {configDraft[toggle.key] !== false ? '✅ ON' : '⏸ OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Create Moderator Modal */}
      {showCreateMod && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 400, border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 20px' }}>Create Moderator</h3>
            {['username', 'email', 'password'].map(field => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 4, textTransform: 'capitalize' }}>{field}</label>
                <input type={field === 'password' ? 'password' : 'text'}
                  value={modForm[field as keyof typeof modForm]}
                  onChange={e => setModForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={createMod} style={btnStyle(C.green)}>Create</button>
              <button onClick={() => setShowCreateMod(false)} style={btnStyle('#475569')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Rep Reason Modal */}
      {resetReasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 420, border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 12px' }}>Reset Reputation</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
              Reset <strong>{resetReasonModal.username}</strong>'s reputation to 50 and clear all toxicity flags.
            </p>
            <textarea placeholder="Required: reason for reset..."
              value={resetReason} onChange={e => setResetReason(e.target.value)}
              style={{ ...inputStyle, width: '100%', height: 80, boxSizing: 'border-box', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={resetRep} disabled={!resetReason.trim()} style={btnStyle(C.purple)}>Confirm Reset</button>
              <button onClick={() => { setResetReasonModal(null); setResetReason(''); }} style={btnStyle('#475569')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Log Modal */}
      {showDeletionLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 700, maxHeight: '80vh', overflow: 'auto', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📜 Session Deletion Log</h3>
              <button onClick={() => setShowDeletionLog(false)} style={btnStyle('#475569')}>✕ Close</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Session', 'Deleted By', 'Role', 'Members Notified', 'Deleted At'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deletionLog.map(d => (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 12px' }}>{d.sessionTitle}</td>
                    <td style={{ padding: '8px 12px' }}>{d.deletedByUser?.username || '—'}</td>
                    <td style={{ padding: '8px 12px', color: C.muted }}>{d.deletedByRole}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{d.membersNotified}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: C.muted }}>{new Date(d.deletedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
