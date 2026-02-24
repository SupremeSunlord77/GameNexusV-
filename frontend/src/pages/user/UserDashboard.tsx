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

// Define types
interface User {
  id: string;
  username: string;
  reputation: number;
}

interface Lobby {
  id: string;
  title: string;
  game: { name: string };
  currentPlayers: number;
  maxPlayers: number;
  hostUserId: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'profile' | 'settings' | 'create'>('home');
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Check Auth & Load User
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');

    if (!token || !storedUserId) {
      console.log("No token found, redirecting to login...");
      navigate('/login');
      return;
    }

    // Fetch User Profile
    api.get(`/profile/${storedUserId}`)
      .then(res => {
        console.log("User loaded:", res.data.user);
        setUser(res.data.user);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
      });

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
      console.log("Fetching lobbies...");
      const res = await api.get('/lfg/sessions');
      setLobbies(res.data);
    } catch (err) {
      console.error("Error fetching lobbies:", err);
    }
  };

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.clear();
    navigate('/login');
  };

  const changeView = (view: 'home' | 'profile' | 'settings' | 'create') => {
    setActiveView(view);
    setSelectedLobbyId(null);
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

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'white', color: 'black', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <div style={{
        width: '250px',
        minWidth: '250px',
        background: '#1e293b',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#60a5fa' }}>🎮 GameNexus</h2>
          {user && <NotificationBell userId={user.id} />}
        </div>

        {user ? (
          <p>Welcome, <strong>{user.username}</strong></p>
        ) : (
          <p style={{ color: '#94a3b8' }}>Guest User</p>
        )}

        {user && <ReputationMeter score={user.reputation} />}

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => changeView('home')} style={navBtnStyle}>🏠 Home</button>
          <button onClick={() => changeView('profile')} style={navBtnStyle}>👤 My Profile</button>
          <button onClick={() => changeView('settings')} style={navBtnStyle}>⚙️ Settings</button>
          <button onClick={() => navigate('/compatibility')} style={navBtnStyle}>🤝 Find Teammates</button>
        </nav>

        <button onClick={handleLogout} style={{ ...navBtnStyle, background: '#ef4444', marginTop: 'auto' }}>
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '40px', background: '#f1f5f9', overflowY: 'auto' }}>

        {selectedLobbyId ? (
          <ChatRoom
            lobbyId={selectedLobbyId}
            username={user?.username || "Guest"}
            onLeave={() => { setSelectedLobbyId(null); fetchLobbies(); }}
          />
        ) : (
          <>
            {activeView === 'create' && <CreateLobby onSuccess={() => changeView('home')} onCancel={() => changeView('home')} />}
            {activeView === 'profile' && <UserProfile />}
            {activeView === 'settings' && <Settings />}

            {activeView === 'home' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h1>Active Lobbies</h1>
                  <button
                    onClick={() => changeView('create')}
                    style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}
                  >
                    + Create Lobby
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {lobbies.length === 0 && <p>No lobbies found.</p>}
                  {lobbies.map((lobby) => (
                    <div key={lobby.id} style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'relative' }}>
                      <h3 style={{ margin: '0 0 8px', paddingRight: 40 }}>{lobby.title}</h3>
                      <p style={{ margin: '0 0 4px', fontSize: 14, color: '#64748b' }}>Game: {lobby.game?.name}</p>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
                        {lobby.currentPlayers}/{lobby.maxPlayers} players
                      </p>

                      {/* Delete button — only for host */}
                      {user && lobby.hostUserId === user.id && (
                        <button
                          onClick={(e) => handleDeleteLobby(lobby.id, e)}
                          disabled={deletingId === lobby.id}
                          title="Delete this lobby"
                          style={{
                            position: 'absolute', top: 12, right: 12,
                            background: 'none', border: '1px solid #fecaca', cursor: 'pointer',
                            fontSize: 14, color: '#ef4444', padding: '4px 8px', borderRadius: 6,
                            opacity: deletingId === lobby.id ? 0.5 : 1
                          }}
                        >
                          🗑️
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedLobbyId(lobby.id)}
                        style={{ width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', marginTop: '10px', cursor: 'pointer' }}
                      >
                        Join Lobby
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const navBtnStyle = {
  padding: '12px', textAlign: 'left' as const, background: 'rgba(255,255,255,0.1)',
  color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
};

export default Dashboard;
