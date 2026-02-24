import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ChatRoom from '../components/ChatRoom';
import CreateLobby from '../components/CreateLobby';
import UserProfile from '../components/UserProfile';
import Compatibility from './user/Compatibility';
import ReputationMeter from '../components/ReputationMeter';

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
  const [user, setUser] = useState<User | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'profile' | 'settings' | 'create' | 'compatibility'>('home');
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [selectedLobbyHostId, setSelectedLobbyHostId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    
    if (!token || !storedUserId) {
      navigate('/login');
      return;
    }
    
    api.get(`/profile/${storedUserId}`)
       .then(res => setUser(res.data.user))
       .catch((err) => console.error("Failed to load profile:", err));
       
    fetchLobbies();
  }, [navigate]);

  const fetchLobbies = async () => {
    try {
      const res = await api.get('/lfg/sessions');
      setLobbies(res.data);
    } catch (err) {
      console.error("Error fetching lobbies:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const changeView = (view: 'home' | 'profile' | 'settings' | 'create' | 'compatibility') => {
    setActiveView(view);
    setSelectedLobbyId(null);
    setSelectedLobbyHostId(null);
    if (view === 'home') fetchLobbies();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'white', color: 'black', overflow: 'hidden' }}>
      
      <div style={{ 
        width: '250px', 
        minWidth: '250px',
        background: '#1e293b', 
        color: 'white', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#60a5fa' }}>🎮 GameNexus</h2>
        
        {user ? (
          <p>Welcome, <strong>{user.username}</strong></p>
        ) : (
          <p style={{ color: '#94a3b8' }}>Guest User</p>
        )}

        {user && <ReputationMeter score={user.reputation} />}

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => changeView('home')} style={navBtnStyle}>🏠 Home</button>
          <button onClick={() => changeView('profile')} style={navBtnStyle}>👤 My Profile</button>
          <button onClick={() => changeView('compatibility')} style={navBtnStyle}>🤝 Compatibility</button>
          <button onClick={() => changeView('settings')} style={navBtnStyle}>⚙️ Settings</button>
        </nav>

        <button onClick={handleLogout} style={{ ...navBtnStyle, background: '#ef4444', marginTop: 'auto' }}>
          Logout
        </button>
      </div>

      <div style={{ flex: 1, padding: '40px', background: '#f1f5f9', overflowY: 'auto' }}>
        
        {selectedLobbyId ? (
          <ChatRoom
            lobbyId={selectedLobbyId}
            hostUserId={selectedLobbyHostId || ""}
            username={user?.username || "Guest"}
            onLeave={() => { setSelectedLobbyId(null); setSelectedLobbyHostId(null); fetchLobbies(); }}
          />
        ) : (
          <>
            {activeView === 'create' && <CreateLobby onSuccess={() => changeView('home')} onCancel={() => changeView('home')} />}
            {activeView === 'profile' && <UserProfile />}
            {activeView === 'compatibility' && <Compatibility />}
            {activeView === 'settings' && <h2>⚙️ Settings Page</h2>}

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
                    <div key={lobby.id} style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <h3>{lobby.title}</h3>
                      <p>Game: {lobby.game?.name}</p>
                      <button
                        onClick={() => { setSelectedLobbyId(lobby.id); setSelectedLobbyHostId(lobby.hostUserId); }}
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