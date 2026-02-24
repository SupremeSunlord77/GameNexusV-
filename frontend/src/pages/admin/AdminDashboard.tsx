import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ReputationMeter from '../../components/ReputationMeter';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // We will build this backend endpoint next!
    // api.get('/admin/users').then(res => setUsers(res.data)); 
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <h1>🛡️ Admin Command Center</h1>
        <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px' }}>
          <h3>Total Users</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>0</p>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px' }}>
          <h3>Banned Players</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>0</p>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px' }}>
          <h3>Toxic Messages Detected</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>0</p>
        </div>
      </div>
      
      <h3 style={{ marginTop: '40px' }}>User Management (Placeholder)</h3>
      <p>The user list will load here once we connect the API.</p>
    </div>
  );
};

export default AdminDashboard;