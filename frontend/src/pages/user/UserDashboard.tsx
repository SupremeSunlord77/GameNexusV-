import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';
import ChatRoom from '../../components/ChatRoom';
import CreateLobby from '../../components/CreateLobby';
import UserProfile from '../../components/UserProfile';
import ReputationMeter from '../../components/ReputationMeter';
import NotificationBell from '../../components/NotificationBell';
import Settings from './Settings';

interface User { id: string; username: string; reputation: number; }
interface Lobby {
  id: string; title: string; game: { name: string };
  currentPlayers: number; maxPlayers: number; compatibilityScore?: number;
  hostUserId?: string;
}

const NAV = [
  { key: 'home',     icon: '⚡', label: 'Lobbies'     },
  { key: 'profile',  icon: '👤', label: 'Profile'      },
  { key: 'settings', icon: '⚙️', label: 'Settings'     },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'profile' | 'settings' | 'create'>('home');
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    if (!token || !storedUserId) { navigate('/login'); return; }
    api.get(`/profile/${storedUserId}`)
      .then(res => setUser(res.data.user))
      .catch(err => console.error('Failed to load profile:', err));
    fetchLobbies();
  }, [navigate]);

  // 2. Socket.IO for session_deleted events
  useEffect(() => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join_lfg_feed');

    socket.on('session_deleted', (data: { sessionId: string; title: string }) => {
      setLobbies(prev => prev.filter(l => l.id !== data.sessionId));
      if (selectedLobbyId === data.sessionId) {
        setSelectedLobbyId(null);
        alert(`Session "${data.title}" has been deleted.`);
      }
    });

    return () => { socket.disconnect(); };
  }, [selectedLobbyId]);

  const fetchLobbies = async () => {
    try {
      const res = await api.get('/lfg/sessions?compatibleWithMe=true');
      setLobbies(res.data);
    } catch (err) { console.error('Error fetching lobbies:', err); }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };
  const changeView = (view: 'home' | 'profile' | 'settings' | 'create') => {
    setActiveView(view); setSelectedLobby(null);
    if (view === 'home') fetchLobbies();
  };

  const handleDeleteLobby = async (lobbyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this lobby? All members will be notified.')) return;
    setDeletingId(lobbyId);
    try {
      await api.delete(`/lfg/sessions/${lobbyId}`);
      setLobbies(prev => prev.filter(l => l.id !== lobbyId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete lobby');
    } finally {
      setDeletingId(null);
    }
  };

  const matchColor = (s?: number) =>
    s === undefined ? '#6b7280' : s >= 0.65 ? '#10b981' : s >= 0.50 ? '#f59e0b' : '#ef4444';
  const matchLabel = (s?: number) =>
    s === undefined ? 'No profile' : `${(s * 100).toFixed(0)}% Match`;

  return (
    <div style={s.layout}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.brand}>
            <div style={s.brandIcon}>⚡</div>
            <span style={s.brandText}>GameNexus</span>
            {user && <NotificationBell userId={user.id} />}
          </div>

          {user && (
            <div style={s.userCard}>
              <div style={s.avatar}>{user.username.charAt(0).toUpperCase()}</div>
              <div>
                <div style={s.username}>{user.username}</div>
                <div style={s.userRole}>Player</div>
              </div>
            </div>
          )}

          {user && <ReputationMeter score={user.reputation} />}
        </div>

        <nav style={s.nav}>
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => item.key === 'compatibility' ? navigate('/compatibility') : changeView(item.key as any)}
              style={{
                ...s.navBtn,
                ...(activeView === item.key && !selectedLobby ? s.navBtnActive : {}),
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button onClick={() => navigate('/compatibility')} style={s.navBtn}>
            <span style={s.navIcon}>🤝</span>Find Teammates
          </button>
        </nav>

        <button onClick={handleLogout} style={s.logoutBtn}>
          <span>⬡</span> Sign Out
        </button>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        {selectedLobby ? (
          <ChatRoom
            lobbyId={selectedLobby.id}
            hostUserId={selectedLobby.hostUserId || ''}
            username={user?.username || 'Guest'}
            onLeave={() => { setSelectedLobby(null); fetchLobbies(); }}
          />
        ) : (
          <>
            {activeView === 'create'   && <CreateLobby onSuccess={() => changeView('home')} onCancel={() => changeView('home')} />}
            {activeView === 'profile'  && <UserProfile />}
            {activeView === 'settings' && <Settings />}

            {activeView === 'home' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                {/* Header bar */}
                <div style={s.pageHeader}>
                  <div>
                    <h1 style={s.pageTitle}>Active Lobbies</h1>
                    <p style={s.pageSubtitle}>Sorted by compatibility match score</p>
                  </div>
                  <button onClick={() => changeView('create')} style={s.createBtn}>
                    + Create Lobby
                  </button>
                </div>

                {lobbies.length === 0 ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>🎮</div>
                    <h3 style={s.emptyTitle}>No lobbies found</h3>
                    <p style={s.emptyText}>Be the first to create one!</p>
                    <button onClick={() => changeView('create')} style={s.createBtn}>Create Lobby</button>
                  </div>
                ) : (
                  <div style={s.grid}>
                    {lobbies.map(lobby => {
                      const sc = lobby.compatibilityScore;
                      const color = matchColor(sc);
                      return (
                        <div key={lobby.id} style={s.lobbyCard}>
                          <div style={s.lobbyCardTop}>
                            <div style={s.gameTag}>{lobby.game?.name || 'Game'}</div>
                            <div style={{ ...s.matchBadge, background: `${color}22`, color, border: `1px solid ${color}44` }}>
                              {matchLabel(sc)}
                            </div>
                          </div>
                          <h3 style={s.lobbyTitle}>{lobby.title}</h3>
                          <div style={s.lobbyMeta}>
                            <div style={s.playerCount}>
                              <span style={s.playerDot} />
                              {lobby.currentPlayers}/{lobby.maxPlayers} Players
                            </div>
                          </div>
                          {sc !== undefined && (
                            <div style={s.compatBar}>
                              <div style={{ ...s.compatFill, width: `${sc * 100}%`, background: color }} />
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedLobby(lobby)}
                            style={s.joinBtn}
                          >
                            Join Lobby →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', height: '100vh', width: '100vw', background: '#0d0d1a', overflow: 'hidden' },

  sidebar: {
    width: 260, minWidth: 260, background: 'rgba(255,255,255,0.02)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', padding: '24px 16px',
    gap: 0,
  },
  sidebarTop: { flex: 1, display: 'flex', flexDirection: 'column', gap: 0 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  brandIcon: {
    width: 34, height: 34, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  },
  brandText: { fontSize: 17, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' },

  userCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '12px 14px', marginBottom: 4,
  },
  avatar: {
    width: 38, height: 38, background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  username: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' },
  userRole: { fontSize: 11, color: '#475569', marginTop: 2 },

  nav: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 20 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 14px', background: 'transparent',
    border: 'none', borderRadius: 10, color: '#64748b',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.15s',
  },
  navBtnActive: {
    background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
    border: '1px solid rgba(124,58,237,0.2)',
  },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },

  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '11px 14px', marginTop: 'auto',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  main: {
    flex: 1, padding: '32px 36px', overflowY: 'auto',
    background: 'radial-gradient(ellipse at 80% 0%, rgba(124,58,237,0.05) 0%, transparent 60%)',
  },

  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#475569', margin: 0 },
  createBtn: {
    padding: '11px 20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
    whiteSpace: 'nowrap',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },

  lobbyCard: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
    padding: '20px', transition: 'all 0.2s',
    cursor: 'default',
  },
  lobbyCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gameTag: {
    fontSize: 11, fontWeight: 700, color: '#a78bfa',
    background: 'rgba(124,58,237,0.15)', padding: '4px 10px',
    borderRadius: 20, letterSpacing: 0.3,
  },
  matchBadge: {
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
  },
  lobbyTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.3 },
  lobbyMeta: { display: 'flex', alignItems: 'center', marginBottom: 12 },
  playerCount: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' },
  playerDot: { width: 6, height: 6, background: '#10b981', borderRadius: '50%' },
  compatBar: {
    height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 14,
  },
  compatFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  joinBtn: {
    width: '100%', padding: '11px',
    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.2s',
  },

  emptyState: {
    textAlign: 'center', padding: '80px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  emptyText: { fontSize: 14, color: '#475569', margin: 0 },
};

export default Dashboard;
