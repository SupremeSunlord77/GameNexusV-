import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlaggedUser {
  id: string;
  username: string;
  reputation: number;
  toxicityFlags: number;
  isBanned: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  isToxic: boolean;
  createdAt: string;
  user: { username: string };
}

interface AuditEntry {
  id: string;
  action: string;
  details: string;
  adminUsername?: string;
  admin?: { username: string };
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const actionColor: Record<string, string> = {
  BAN_USER: '#ef4444',
  UNBAN_USER: '#22c55e',
  WARN_USER: '#f59e0b',
  MANUAL_REP: '#3b82f6',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ModeratorDashboard = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FlaggedUser | null>(null);
  const [chatContext, setChatContext] = useState<ChatMessage[]>([]);
  const [chatContextMsgId, setChatContextMsgId] = useState('');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'audit'>('queue');
  const [actionMsg, setActionMsg] = useState('');
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    fetchFlaggedUsers();
  }, []);

  // Listen for live admin room events (mod can see them too)
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join_admin'));
    socket.on('admin_activity', (entry: AuditEntry) => {
      setAuditLog(prev => [entry, ...prev].slice(0, 50));
    });
    return () => { socket.disconnect(); };
  }, []);

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const fetchFlaggedUsers = () =>
    api.get('/moderator/users')
      .then(r => setFlaggedUsers(r.data))
      .catch(console.error);

  const fetchAuditLog = () =>
    api.get('/admin/audit-logs')
      .then(r => setAuditLog(r.data))
      .catch(console.error);

  const handleTabChange = (tab: 'queue' | 'audit') => {
    setActiveTab(tab);
    if (tab === 'audit' && auditLog.length === 0) fetchAuditLog();
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    try {
      const res = await api.post(`/moderator/ban/${userId}`);
      flash(res.data.message);
      setFlaggedUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !isBanned } : u));
      if (selectedUser?.id === userId) setSelectedUser(u => u ? { ...u, isBanned: !isBanned } : u);
    } catch { flash('Action failed'); }
  };

  const handleWarn = async (userId: string) => {
    const reason = prompt('Enter warning reason:');
    if (!reason) return;
    try {
      await api.post(`/moderator/warn/${userId}`, { reason });
      flash('Warning issued');
    } catch { flash('Action failed'); }
  };

  const handleRepAdjust = async (userId: string) => {
    const raw = prompt('Adjust reputation by (+/- number):');
    const amount = parseInt(raw || '0', 10);
    if (isNaN(amount)) return;
    try {
      const res = await api.post(`/moderator/reputation/${userId}`, { amount });
      flash(`Reputation updated → ${res.data.newScore}`);
      fetchFlaggedUsers();
    } catch { flash('Action failed'); }
  };

  const handleViewContext = async () => {
    if (!chatContextMsgId.trim()) return;
    setLoadingContext(true);
    try {
      const res = await api.get(`/moderator/chat-context/${chatContextMsgId.trim()}`);
      setChatContext(res.data);
    } catch { flash('Message not found or access denied'); }
    finally { setLoadingContext(false); }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 240, background: '#1e293b', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 8 }}>
        <h2 style={{ color: '#f59e0b', margin: '0 0 24px', fontSize: 18 }}>⚖️ Moderator Station</h2>

        {/* Read-only stats */}
        <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Flagged Users</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{flaggedUsers.length}</div>
        </div>
        <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Banned</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>
            {flaggedUsers.filter(u => u.isBanned).length}
          </div>
        </div>

        {(['queue', 'audit'] as const).map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)} style={{
            padding: '10px 14px', textAlign: 'left', border: 'none', borderRadius: 8,
            background: activeTab === tab ? '#f59e0b' : 'transparent',
            color: activeTab === tab ? '#000' : '#94a3b8', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab ? 700 : 400
          }}>
            {tab === 'queue' ? '🚩 Report Queue' : '📋 Audit Log'}
          </button>
        ))}

        <button onClick={handleLogout} style={{
          marginTop: 'auto', padding: '10px 14px', background: '#ef4444',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
        }}>Logout</button>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: user list or audit log ── */}
        <div style={{ width: 340, borderRight: '1px solid #1e293b', overflowY: 'auto', padding: '20px 16px' }}>

          {actionMsg && (
            <div style={{ background: '#1e40af', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>✅ {actionMsg}</div>
          )}

          {/* Report Queue */}
          {activeTab === 'queue' && (
            <>
              <h3 style={{ margin: '0 0 12px', color: '#f59e0b' }}>Flagged Players</h3>
              {flaggedUsers.length === 0 && (
                <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>No flagged players 🎉</div>
              )}
              {flaggedUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                    background: selectedUser?.id === user.id ? '#1e40af' : '#1e293b',
                    borderLeft: `4px solid ${user.toxicityFlags >= 5 ? '#ef4444' : '#f59e0b'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{user.username}</span>
                    <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>⚑ {user.toxicityFlags}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Rep: {user.reputation} · {user.isBanned ? '🔴 BANNED' : '🟢 Active'}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Audit Log */}
          {activeTab === 'audit' && (
            <>
              <h3 style={{ margin: '0 0 12px', color: '#60a5fa' }}>Action History
                <span style={{ marginLeft: 8, fontSize: 12, color: '#34d399', fontWeight: 400 }}>● Live</span>
              </h3>
              {auditLog.length === 0 && (
                <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>No actions logged yet</div>
              )}
              {auditLog.map(entry => (
                <div key={entry.id} style={{
                  background: '#1e293b', borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                  borderLeft: `3px solid ${actionColor[entry.action] ?? '#64748b'}`
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      background: actionColor[entry.action] ?? '#64748b',
                      padding: '2px 6px', borderRadius: 8
                    }}>{entry.action}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {entry.adminUsername ?? entry.admin?.username}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>{entry.details}</div>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Right: action panel ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {!selectedUser && activeTab === 'queue' && (
            <div style={{ textAlign: 'center', color: '#475569', paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
              <p>Select a flagged player from the queue to review</p>
            </div>
          )}

          {selectedUser && activeTab === 'queue' && (
            <div>
              {/* Player header */}
              <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#f1f5f9' }}>{selectedUser.username}</h2>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <Chip color="#f59e0b">⚑ {selectedUser.toxicityFlags} flags</Chip>
                    <Chip color={selectedUser.reputation >= 50 ? '#34d399' : '#ef4444'}>
                      Rep: {selectedUser.reputation}
                    </Chip>
                    <Chip color={selectedUser.isBanned ? '#ef4444' : '#22c55e'}>
                      {selectedUser.isBanned ? 'BANNED' : 'ACTIVE'}
                    </Chip>
                  </div>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <ModBtn onClick={() => handleWarn(selectedUser.id)} color="#f59e0b">⚠️ Warn</ModBtn>
                  <ModBtn onClick={() => handleRepAdjust(selectedUser.id)} color="#3b82f6">📈 Rep</ModBtn>
                  <ModBtn onClick={() => handleBan(selectedUser.id, selectedUser.isBanned)} color={selectedUser.isBanned ? '#22c55e' : '#ef4444'}>
                    {selectedUser.isBanned ? '✅ Unban' : '🔨 Ban'}
                  </ModBtn>
                </div>
              </div>

              {/* Chat context lookup */}
              <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 16px', color: '#94a3b8' }}>🔍 Chat Log Review</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
                  Enter a message ID to view surrounding chat context (5 messages before the flagged message).
                </p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input
                    placeholder="Paste message ID here…"
                    value={chatContextMsgId}
                    onChange={e => setChatContextMsgId(e.target.value)}
                    style={{
                      flex: 1, padding: '10px 14px', background: '#0f172a',
                      border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14
                    }}
                  />
                  <button
                    onClick={handleViewContext}
                    disabled={loadingContext}
                    style={{
                      padding: '10px 20px', background: '#7c3aed', color: '#fff',
                      border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
                    }}
                  >{loadingContext ? 'Loading…' : 'View Context'}</button>
                </div>

                {chatContext.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chatContext.map(msg => (
                      <div key={msg.id} style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: msg.isToxic ? 'rgba(239,68,68,0.1)' : '#0f172a',
                        borderLeft: msg.isToxic ? '3px solid #ef4444' : '3px solid #334155'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: msg.isToxic ? '#fca5a5' : '#e2e8f0' }}>
                            {msg.user.username}
                            {msg.isToxic && <span style={{ marginLeft: 8, fontSize: 10, background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>TOXIC</span>}
                          </span>
                          <span style={{ fontSize: 11, color: '#475569' }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontSize: 14, color: '#cbd5e1' }}>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div style={{ textAlign: 'center', color: '#475569', paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p>Audit log shown in the left panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ padding: '4px 10px', background: `${color}22`, color, borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function ModBtn({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', background: 'transparent', color,
      border: `1px solid ${color}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
    }}>{children}</button>
  );
}

export default ModeratorDashboard;
