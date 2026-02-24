import { useNavigate } from 'react-router-dom';

const ModeratorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', background: '#1e293b', minHeight: '100vh', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>⚖️ Moderator Station</h1>
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '5px' }}>Logout</button>
      </div>
      <p>Select a flagged message to review...</p>
    </div>
  );
};

export default ModeratorDashboard;