import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  activeSessions: number;
  bannedUsers: number;
  toxicCount: number;
  toxicMessages: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  reputation: number;
  isBanned: boolean;
  toxicityFlags: number;
}

interface AuditEntry {
  id: string;
  action: string;
  details: string;
  adminUsername?: string;
  createdAt: string;
  admin?: { username: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const actionColor: Record<string, string> = {
  BAN_USER: '#ef4444',
  UNBAN_USER: '#22c55e',
  WARN_USER: '#f59e0b',
  MANUAL_REP: '#3b82f6',
  HIRE_MOD: '#a855f7',
};

function actionBadge(action: string) {
  const color = actionColor[action] ?? '#64748b';
  return (
    <span style={{
      background: color, color: '#fff', padding: '2px 8px',
      borderRadius: '12px', fontSize: '11px', fontWeight: 700
    }}>{action.replace('_', ' ')}</span>
  );
}

// Fake 7-day toxicity trend data (populated from real toxicCount in a production app)
function buildToxicityTrend(totalFlags: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    flags: Math.max(0, Math.round((totalFlags / 7) * (0.6 + Math.sin(i) * 0.4)))
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'charts'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [createModForm, setCreateModForm] = useState({ open: false, username: '', email: '', password: '' });

  // ── Load initial data ──
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchAuditLog();
  }, []);

  // ── Socket.IO connection for real-time activity feed ──
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join_admin'));
    socket.on('admin_activity', (entry: AuditEntry) => {
      setAuditLog(prev => [entry, ...prev].slice(0, 50));
    });
    return () => { socket.disconnect(); };
  }, []);

  const fetchStats = () =>
    api.get('/admin/stats').then(r => setStats(r.data)).catch(console.error);

  const fetchUsers = () =>
    api.get('/admin/users').then(r => setUsers(r.data)).catch(console.error);

  const fetchAuditLog = () =>
    api.get('/admin/audit-logs').then(r => setAuditLog(r.data)).catch(console.error);

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  // ── User Actions ──
  const handleBan = async (userId: string, isBanned: boolean) => {
    try {
      const res = await api.post(`/admin/ban/${userId}`);
      flash(res.data.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !isBanned } : u));
      fetchStats();
    } catch { flash('Action failed'); }
  };

  const handleWarn = async (userId: string) => {
    const reason = prompt('Enter warning reason:');
    if (!reason) return;
    try {
      await api.post(`/admin/warn/${userId}`, { reason });
      flash('Warning issued');
    } catch { flash('Action failed'); }
  };

  const handleRepAdjust = async (userId: string) => {
    const raw = prompt('Adjust reputation by (+/- number, e.g. -10):');
    const amount = parseInt(raw || '0', 10);
    if (isNaN(amount)) return;
    try {
      const res = await api.post(`/admin/reputation/${userId}`, { amount });
      flash(`Reputation updated → ${res.data.newScore}`);
      fetchUsers();
    } catch { flash('Action failed'); }
  };

  const handleCreateMod = async () => {
    const { username, email, password } = createModForm;
    if (!username || !email || !password) return flash('All fields required');
    try {
      await api.post('/admin/create-moderator', { username, email, password });
      flash(`Moderator "${username}" created`);
      setCreateModForm({ open: false, username: '', email: '', password: '' });
    } catch (e: any) {
      flash(e.response?.data?.error || 'Failed to create moderator');
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toxicityTrend = stats ? buildToxicityTrend(stats.toxicCount) : [];

  // DAU bar chart — placeholder buckets based on totalUsers
  const dauData = stats ? [
    { day: 'Mon', dau: Math.round(stats.totalUsers * 0.4) },
    { day: 'Tue', dau: Math.round(stats.totalUsers * 0.55) },
    { day: 'Wed', dau: Math.round(stats.totalUsers * 0.6) },
    { day: 'Thu', dau: Math.round(stats.totalUsers * 0.5) },
    { day: 'Fri', dau: Math.round(stats.totalUsers * 0.7) },
    { day: 'Sat', dau: Math.round(stats.totalUsers * 0.8) },
    { day: 'Sun', dau: Math.round(stats.totalUsers * 0.65) },
  ] : [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 240, background: '#1e293b', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 8 }}>
        <h2 style={{ color: '#60a5fa', margin: '0 0 24px', fontSize: 18 }}>🛡️ Admin Center</h2>
        {(['users', 'activity', 'charts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 14px', textAlign: 'left', border: 'none', borderRadius: 8,
            background: activeTab === tab ? '#3b82f6' : 'transparent',
            color: activeTab === tab ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 14
          }}>
            {tab === 'users' ? '👥 User Management' : tab === 'activity' ? '📋 Activity Feed' : '📊 Analytics'}
          </button>
        ))}
        <button onClick={() => setCreateModForm(f => ({ ...f, open: true }))} style={{
          marginTop: 'auto', padding: '10px 14px', background: '#7c3aed',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
        }}>+ Create Moderator</button>
        <button onClick={handleLogout} style={{
          padding: '10px 14px', background: '#ef4444', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
        }}>Logout</button>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Stats Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: '20px 24px 12px' }}>
          {[
            { label: 'Total Users', value: stats?.totalUsers ?? '…', color: '#60a5fa' },
            { label: 'Active Sessions', value: stats?.activeSessions ?? '…', color: '#34d399' },
            { label: 'Banned Players', value: stats?.bannedUsers ?? '…', color: '#ef4444' },
            { label: 'Toxicity Flags', value: stats?.toxicCount ?? '…', color: '#f59e0b' },
            { label: 'Toxic Messages', value: stats?.toxicMessages ?? '…', color: '#f97316' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', padding: '16px 20px', borderRadius: 12, borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Flash message ── */}
        {actionMsg && (
          <div style={{ margin: '0 24px 8px', background: '#1e40af', padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
            ✅ {actionMsg}
          </div>
        )}

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>User Management</h3>
                <input
                  placeholder="Search username or email…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 14px', background: '#1e293b', border: '1px solid #334155',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: 250
                  }}
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      {['Username', 'Email', 'Reputation', 'Toxicity Flags', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderTop: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{user.username}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{user.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            color: user.reputation >= 70 ? '#34d399' : user.reputation >= 40 ? '#f59e0b' : '#ef4444',
                            fontWeight: 700
                          }}>{user.reputation}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: user.toxicityFlags > 3 ? '#ef4444' : '#e2e8f0' }}>
                          {user.toxicityFlags}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                            background: user.isBanned ? '#7f1d1d' : '#14532d',
                            color: user.isBanned ? '#fca5a5' : '#86efac'
                          }}>{user.isBanned ? 'BANNED' : 'ACTIVE'}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <ActionBtn onClick={() => handleBan(user.id, user.isBanned)} color={user.isBanned ? '#22c55e' : '#ef4444'}>
                              {user.isBanned ? 'Unban' : 'Ban'}
                            </ActionBtn>
                            <ActionBtn onClick={() => handleWarn(user.id)} color="#f59e0b">Warn</ActionBtn>
                            <ActionBtn onClick={() => handleRepAdjust(user.id)} color="#3b82f6">Rep</ActionBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#475569' }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity Feed Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 style={{ margin: '0 0 16px' }}>Real-Time Activity Feed
                <span style={{ marginLeft: 10, fontSize: 12, color: '#34d399', fontWeight: 400 }}>● Live</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auditLog.length === 0 && (
                  <div style={{ color: '#475569', textAlign: 'center', padding: 32 }}>No activity yet</div>
                )}
                {auditLog.map(entry => (
                  <div key={entry.id} style={{
                    background: '#1e293b', borderRadius: 10, padding: '12px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    borderLeft: `4px solid ${actionColor[entry.action] ?? '#64748b'}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {actionBadge(entry.action)}
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          by {entry.adminUsername ?? entry.admin?.username ?? 'admin'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1' }}>{entry.details}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div>
                <h3 style={{ margin: '0 0 16px' }}>Daily Active Users (Est.)</h3>
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dauData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                      <Bar dataKey="dau" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 style={{ margin: '0 0 16px' }}>Toxicity Flags Over 7 Days</h3>
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={toxicityTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                      <Legend />
                      <Line type="monotone" dataKey="flags" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Toxicity Flags" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Create Moderator Modal ── */}
      {createModForm.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: 400 }}>
            <h3 style={{ margin: '0 0 20px', color: '#a855f7' }}>Create Moderator Account</h3>
            {(['username', 'email', 'password'] as const).map(field => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'capitalize' }}>{field}</label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  value={createModForm[field]}
                  onChange={e => setCreateModForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleCreateMod} style={{ flex: 1, padding: 12, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Create</button>
              <button onClick={() => setCreateModForm(f => ({ ...f, open: false }))} style={{ flex: 1, padding: 12, background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ActionBtn({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: 'transparent', color,
      border: `1px solid ${color}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
    }}>{children}</button>
  );
}

export default AdminDashboard;
