import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface FlaggedUser {
  id: string;
  username: string;
  reputation: number;
  toxicityFlags: number;
  isBanned: boolean;
  eigenTrustScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  disciplinaryActions: { actionType: string; expiresAt?: string }[];
}

interface ChatMessage {
  id: string;
  content: string;
  isToxic: boolean;
  createdAt: string;
  user: { username: string };
  session?: { title: string };
}

interface DisciplinaryAction {
  id: string;
  actionType: string;
  reason?: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface Ticket {
  id: string;
  ticketType: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: { username: string };
  reportedUser?: { username: string };
  assignedStaff?: { username: string };
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
  orange: '#f97316',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 20,
};

const btnStyle = (bg = C.accent): React.CSSProperties => ({
  padding: '7px 14px',
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
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

const priorityColor = { HIGH: C.red, MEDIUM: C.yellow, LOW: C.green };
const priorityIcon = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };

type Section = 'flagged' | 'chat' | 'actions' | 'tickets';

// ─── Component ──────────────────────────────────────────────────────────────
export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [section, setSection] = useState<Section>('flagged');
  const [realtimeFeed, setRealtimeFeed] = useState<any[]>([]);

  // Flagged users
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<FlaggedUser | null>(null);

  // Chat context
  const [chatUserId, setChatUserId] = useState('');
  const [chatSessionId, setChatSessionId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Disciplinary action modals
  const [muteModal, setMuteModal] = useState<{ userId: string; username: string } | null>(null);
  const [muteDuration, setMuteDuration] = useState(30);
  const [muteReason, setMuteReason] = useState('');
  const [shadowModal, setShadowModal] = useState<{ userId: string; username: string } | null>(null);
  const [shadowReason, setShadowReason] = useState('');

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketStatus, setTicketStatus] = useState('open');
  const [resolveModal, setResolveModal] = useState<{ ticketId: string; action: 'resolve' | 'dismiss' } | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // ─── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_admin');
    socket.on('admin_activity', (entry: any) => {
      setRealtimeFeed(prev => [entry, ...prev].slice(0, 30));
    });
    return () => { socket.disconnect(); };
  }, []);

  // ─── Fetchers ──────────────────────────────────────────────────────────────
  const fetchFlagged = useCallback(async () => {
    try {
      const r = await api.get('/moderator/users/flagged');
      setFlaggedUsers(r.data);
    } catch (_) {}
  }, []);

  const fetchChatContext = async () => {
    if (!chatUserId.trim()) return;
    setChatLoading(true);
    try {
      const params = chatSessionId ? `?sessionId=${chatSessionId}` : '';
      const r = await api.get(`/moderator/users/${chatUserId}/chat-context${params}`);
      setChatMessages(r.data);
    } catch (_) {
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchTickets = useCallback(async () => {
    try {
      const r = await api.get(`/moderator/tickets?status=${ticketStatus}`);
      setTickets(r.data);
    } catch (_) {}
  }, [ticketStatus]);

  useEffect(() => {
    if (section === 'flagged') fetchFlagged();
    if (section === 'tickets') fetchTickets();
  }, [section, ticketStatus]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const doWarn = async (userId: string, username: string) => {
    const reason = prompt(`Reason for warning ${username}:`);
    if (!reason) return;
    try {
      await api.post(`/moderator/warn/${userId}`, { reason });
      showToast(`Warning issued to ${username}`);
      fetchFlagged();
    } catch (_) { showToast('Failed to warn user'); }
  };

  const doAdjustRep = async (userId: string, username: string) => {
    const amountStr = prompt(`Adjust reputation for ${username} (e.g. -10 or +5):`);
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return;
    try {
      await api.post(`/moderator/reputation/${userId}`, { amount });
      showToast(`Reputation adjusted by ${amount}`);
      fetchFlagged();
    } catch (_) { showToast('Failed to adjust reputation'); }
  };

  const doBan = async (userId: string, isBanned: boolean) => {
    try {
      await api.post(`/moderator/ban/${userId}`);
      showToast(isBanned ? 'User unbanned' : 'User banned');
      fetchFlagged();
    } catch (_) { showToast('Failed to toggle ban'); }
  };

  const doMute = async () => {
    if (!muteModal) return;
    try {
      await api.post(`/moderator/actions/mute/${muteModal.userId}`, { durationMinutes: muteDuration, reason: muteReason });
      showToast(`${muteModal.username} muted for ${muteDuration} minutes`);
      setMuteModal(null);
      setMuteReason('');
      fetchFlagged();
    } catch (_) { showToast('Failed to mute user'); }
  };

  const doShadowBan = async () => {
    if (!shadowModal) return;
    try {
      await api.post(`/moderator/actions/shadow-ban/${shadowModal.userId}`, { reason: shadowReason });
      showToast(`${shadowModal.username} shadow banned`);
      setShadowModal(null);
      setShadowReason('');
      fetchFlagged();
    } catch (_) { showToast('Failed to shadow ban user'); }
  };

  const liftAction = async (actionId: string) => {
    try {
      await api.delete(`/moderator/actions/${actionId}`);
      showToast('Action lifted');
      fetchFlagged();
    } catch (_) { showToast('Failed to lift action'); }
  };

  const assignTicket = async (ticketId: string) => {
    try {
      await api.patch(`/moderator/tickets/${ticketId}/assign`);
      showToast('Ticket assigned to you');
      fetchTickets();
    } catch (_) {}
  };

  const resolveOrDismiss = async () => {
    if (!resolveModal) return;
    const endpoint = resolveModal.action === 'resolve' ? 'resolve' : 'dismiss';
    try {
      await api.patch(`/moderator/tickets/${resolveModal.ticketId}/${endpoint}`, { resolutionNote: resolveNote });
      showToast(`Ticket ${resolveModal.action}d`);
      setResolveModal(null);
      setResolveNote('');
      fetchTickets();
    } catch (_) { showToast('Failed to update ticket'); }
  };

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  const sideItems: { key: Section; label: string }[] = [
    { key: 'flagged', label: '🚩 Flagged Queue' },
    { key: 'chat', label: '💬 Chat Context' },
    { key: 'actions', label: '⚖️ Actions & Live Feed' },
    { key: 'tickets', label: '🎫 Support Tickets' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, minWidth: 220, background: C.card, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.cyan }}>🛡️ Moderator</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>GameNexus Mod Panel</div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sideItems.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)} style={{
              padding: '10px 12px', textAlign: 'left',
              background: section === item.key ? 'rgba(6,182,212,0.15)' : 'transparent',
              color: section === item.key ? C.cyan : C.muted,
              border: section === item.key ? `1px solid rgba(6,182,212,0.4)` : '1px solid transparent',
              borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: section === item.key ? 600 : 400,
            }}>{item.label}</button>
          ))}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => navigate('/dashboard')} style={{ ...btnStyle('#475569'), width: '100%' }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

        {/* ── SECTION 1: FLAGGED QUEUE ─────────────────────────────── */}
        {section === 'flagged' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>🚩 Flagged Player Queue</h2>

            {flaggedUsers.length === 0 && <p style={{ color: C.muted }}>No flagged players. Great job! 🎉</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {flaggedUsers.map(u => (
                <div key={u.id} style={{ ...cardStyle, borderLeft: `4px solid ${priorityColor[u.priority]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{u.username}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: priorityColor[u.priority] + '33', color: priorityColor[u.priority], border: `1px solid ${priorityColor[u.priority]}` }}>
                          {priorityIcon[u.priority]} {u.priority}
                        </span>
                        {u.isBanned && <span style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>🚫 BANNED</span>}
                      </div>

                      <div style={{ display: 'flex', gap: 24, fontSize: 12, color: C.muted, marginBottom: 12 }}>
                        <span>Rep: <strong style={{ color: u.reputation < 30 ? C.red : u.reputation < 60 ? C.yellow : C.green }}>{u.reputation}</strong></span>
                        <span>Flags: <strong style={{ color: C.red }}>{u.toxicityFlags}</strong></span>
                        <span>Trust: <strong style={{ color: C.accent }}>{u.eigenTrustScore?.toFixed(2)}</strong></span>
                      </div>

                      {u.disciplinaryActions.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                          {u.disciplinaryActions.map((a, i) => (
                            <span key={i} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                              background: a.actionType === 'mute' ? C.yellow + '33' : C.purple + '33',
                              color: a.actionType === 'mute' ? C.yellow : C.purple, border: `1px solid currentColor` }}>
                              {a.actionType === 'mute' ? '🔇' : '👻'} {a.actionType}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 280 }}>
                      <button onClick={() => doWarn(u.id, u.username)} style={btnStyle(C.yellow)}>⚠️ Warn</button>
                      <button onClick={() => doAdjustRep(u.id, u.username)} style={btnStyle(C.purple)}>📊 Rep</button>
                      <button onClick={() => setMuteModal({ userId: u.id, username: u.username })} style={btnStyle(C.orange)}>🔇 Mute</button>
                      <button onClick={() => setShadowModal({ userId: u.id, username: u.username })} style={btnStyle('#7c3aed')}>👻 Shadow</button>
                      <button onClick={() => doBan(u.id, u.isBanned)} style={btnStyle(u.isBanned ? C.green : C.red)}>
                        {u.isBanned ? '✅ Unban' : '🚫 Ban'}
                      </button>
                      <button onClick={() => { setChatUserId(u.id); setSection('chat'); }} style={btnStyle(C.cyan)}>💬 Chat</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 2: CHAT CONTEXT ──────────────────────────────── */}
        {section === 'chat' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>💬 Chat Context Viewer</h2>

            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 4 }}>User ID</label>
                  <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Paste user ID..."
                    value={chatUserId}
                    onChange={e => setChatUserId(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 4 }}>Session ID (optional)</label>
                  <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    placeholder="Filter by session..."
                    value={chatSessionId}
                    onChange={e => setChatSessionId(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={fetchChatContext} disabled={chatLoading || !chatUserId.trim()} style={btnStyle(C.accent)}>
                    {chatLoading ? '...' : '🔍 Load'}
                  </button>
                </div>
              </div>
            </div>

            {chatMessages.length === 0 && !chatLoading && (
              <p style={{ color: C.muted, fontSize: 13 }}>Enter a User ID above and click Load to view their recent messages.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.map(msg => (
                <div key={msg.id} style={{
                  ...cardStyle,
                  padding: '12px 16px',
                  borderLeft: `4px solid ${msg.isToxic ? C.red : C.border}`,
                  background: msg.isToxic ? 'rgba(239,68,68,0.08)' : C.card
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 13 }}>{msg.user.username}</strong>
                      {msg.session && <span style={{ fontSize: 11, color: C.muted }}>in {msg.session.title}</span>}
                      {msg.isToxic && (
                        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: C.red, color: 'white' }}>
                          TOXIC
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: C.muted }}>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: msg.isToxic ? '#fca5a5' : C.text, lineHeight: 1.5 }}>{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 3: ACTIONS & LIVE FEED ──────────────────────── */}
        {section === 'actions' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>⚖️ Actions & Live Audit Feed</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Quick action panel */}
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.cyan }}>Quick Actions</h3>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                  Select a user from the Flagged Queue and use their User ID to perform actions below.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: '🚩 View Flagged Queue', action: () => setSection('flagged'), color: C.orange },
                    { label: '💬 Open Chat Context Viewer', action: () => setSection('chat'), color: C.cyan },
                    { label: '🎫 View Support Tickets', action: () => setSection('tickets'), color: C.accent },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{ ...btnStyle(item.color), textAlign: 'left', padding: '12px 16px' }}>
                      {item.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 20, padding: '12px', background: '#0f172a', borderRadius: 8, fontSize: 12, color: C.muted }}>
                  <strong style={{ color: C.text, display: 'block', marginBottom: 6 }}>Discipline Guide</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>⚠️ <strong>Warn</strong> — First offense, minor toxicity</span>
                    <span>🔇 <strong>Mute</strong> — Repeated toxicity in chat</span>
                    <span>👻 <strong>Shadow-Ban</strong> — Chronic session disruption</span>
                    <span>🚫 <strong>Ban</strong> — Severe or continued violations</span>
                  </div>
                </div>
              </div>

              {/* Live audit feed */}
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.cyan }}>🔴 Live Audit Feed</h3>
                {realtimeFeed.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 13 }}>Waiting for activity...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                    {realtimeFeed.map((entry, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#0f172a', borderRadius: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                            background: C.orange + '33', color: C.orange, border: `1px solid ${C.orange}` }}>
                            {entry.action}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>{entry.details}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 4: SUPPORT TICKETS ───────────────────────────── */}
        {section === 'tickets' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>🎫 Support Tickets</h2>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['open', 'assigned', 'resolved', 'dismissed'].map(status => (
                <button key={status} onClick={() => setTicketStatus(status)} style={{
                  ...btnStyle(ticketStatus === status ? C.accent : '#475569'),
                  textTransform: 'capitalize'
                }}>{status}</button>
              ))}
            </div>

            {tickets.length === 0 && <p style={{ color: C.muted }}>No {ticketStatus} tickets.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tickets.map(t => (
                <div key={t.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', align: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: t.ticketType === 'ghosting' ? '#7c3aed33' : t.ticketType === 'toxicity' ? '#ef444433' : '#47556933',
                          color: t.ticketType === 'ghosting' ? C.purple : t.ticketType === 'toxicity' ? C.red : C.muted }}>
                          {t.ticketType}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                          background: t.status === 'open' ? C.yellow + '33' : t.status === 'resolved' ? C.green + '33' : '#47556933',
                          color: t.status === 'open' ? C.yellow : t.status === 'resolved' ? C.green : C.muted }}>
                          {t.status}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: C.text }}>{t.description}</p>
                      <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 16 }}>
                        <span>Reporter: <strong style={{ color: C.text }}>{t.reporter.username}</strong></span>
                        {t.reportedUser && <span>Against: <strong style={{ color: C.red }}>{t.reportedUser.username}</strong></span>}
                        {t.assignedStaff && <span>Assigned: <strong style={{ color: C.cyan }}>{t.assignedStaff.username}</strong></span>}
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }}>
                      {t.status === 'open' && (
                        <button onClick={() => assignTicket(t.id)} style={btnStyle(C.cyan)}>📋 Assign</button>
                      )}
                      {(t.status === 'open' || t.status === 'assigned') && (
                        <>
                          <button onClick={() => { setResolveModal({ ticketId: t.id, action: 'resolve' }); setResolveNote(''); }} style={btnStyle(C.green)}>
                            ✅ Resolve
                          </button>
                          <button onClick={() => { setResolveModal({ ticketId: t.id, action: 'dismiss' }); setResolveNote(''); }} style={btnStyle('#475569')}>
                            ✕ Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TOAST ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1e293b', border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '12px 20px', fontSize: 13, color: C.text, zIndex: 2000, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Mute Modal */}
      {muteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 420, border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 16px' }}>🔇 Mute {muteModal.username}</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 4 }}>Duration (minutes)</label>
              <select value={muteDuration} onChange={e => setMuteDuration(parseInt(e.target.value))} style={{ ...inputStyle, width: '100%' }}>
                {[5, 15, 30, 60, 120, 360, 1440].map(d => (
                  <option key={d} value={d}>{d < 60 ? `${d} minutes` : d < 1440 ? `${d/60} hours` : '24 hours'}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 4 }}>Reason</label>
              <textarea value={muteReason} onChange={e => setMuteReason(e.target.value)}
                placeholder="Why are you muting this user?"
                style={{ ...inputStyle, width: '100%', height: 70, boxSizing: 'border-box', resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doMute} style={btnStyle(C.orange)}>🔇 Mute</button>
              <button onClick={() => setMuteModal(null)} style={btnStyle('#475569')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Shadow-Ban Modal */}
      {shadowModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 420, border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 8px' }}>👻 Shadow-Ban {shadowModal.username}</h3>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              The user will appear to join sessions normally but won't actually be added. They will not be notified.
            </p>
            <textarea value={shadowReason} onChange={e => setShadowReason(e.target.value)}
              placeholder="Reason for shadow ban..."
              style={{ ...inputStyle, width: '100%', height: 70, boxSizing: 'border-box', resize: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doShadowBan} style={btnStyle('#7c3aed')}>👻 Shadow Ban</button>
              <button onClick={() => setShadowModal(null)} style={btnStyle('#475569')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve/Dismiss Ticket Modal */}
      {resolveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 420, border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: '0 0 12px', textTransform: 'capitalize' }}>
              {resolveModal.action === 'resolve' ? '✅ Resolve' : '✕ Dismiss'} Ticket
            </h3>
            <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
              placeholder={`Add a ${resolveModal.action === 'resolve' ? 'resolution' : 'dismissal'} note...`}
              style={{ ...inputStyle, width: '100%', height: 80, boxSizing: 'border-box', resize: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={resolveOrDismiss} style={btnStyle(resolveModal.action === 'resolve' ? C.green : '#475569')}>
                Confirm
              </button>
              <button onClick={() => setResolveModal(null)} style={btnStyle('#475569')}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
