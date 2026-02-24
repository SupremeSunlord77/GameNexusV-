import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Compatibility() {
  const [users, setUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      const currentUserId = localStorage.getItem('userId');
      setUsers(res.data.filter((u: any) => u.id !== currentUserId));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const calculateCompatibility = async () => {
    if (!targetUserId) {
      alert('Please select a user');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/behavioral/compatibility/${targetUserId}`);
      setResult(res.data);
    } catch (error: any) {
      console.error('Compatibility calculation failed:', error);
      alert(error.response?.data?.error || 'Failed to calculate compatibility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '30px' }}>
        🤝 Compatibility Calculator
      </h1>

      {/* User Selection */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '10px' }}>
          Select a player to compare with:
        </label>
        <div style={{ display: 'flex', gap: '15px' }}>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              fontSize: '1rem'
            }}
          >
            <option value="">Choose a player...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>

          <button
            onClick={calculateCompatibility}
            disabled={loading || !targetUserId}
            style={{
              padding: '12px 30px',
              background: targetUserId ? '#667eea' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: targetUserId ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? 'Calculating...' : 'Calculate Compatibility'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && !result.needsAssessment && (
        <>
          {/* Compatibility Score Card */}
          <div style={{
            background: getScoreColor(result.score),
            padding: '50px',
            borderRadius: '16px',
            marginBottom: '30px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '6rem', fontWeight: 'bold', marginBottom: '15px' }}>
              {(result.score * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '15px' }}>
              {result.interpretation}
            </div>
            <div style={{ fontSize: '1.2rem', opacity: 0.95 }}>
              {result.recommendation}
            </div>
          </div>

          {/* Breakdown */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>📊 Score Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <StatCard
                label="Behavioral Similarity"
                value={(result.breakdown.behavioral * 100).toFixed(1) + '%'}
                weight="70% of score"
              />
              <StatCard
                label="Trust Score"
                value={(result.breakdown.trust * 100).toFixed(1) + '%'}
                weight="30% of score"
              />
              <StatCard
                label="Euclidean Distance"
                value={result.breakdown.distance.toFixed(3)}
                weight="5D space"
              />
            </div>
          </div>

          {/* Player Info */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>👥 Player Types</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
              <PlayerCard
                label="You"
                username={result.details.user1.username}
                type={result.details.user1.type}
              />
              <PlayerCard
                label="Them"
                username={result.details.user2.username}
                type={result.details.user2.type}
              />
            </div>
          </div>
        </>
      )}

      {result && result.needsAssessment && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
          <p style={{ fontSize: '1.3rem', fontWeight: '600', color: '#92400e', margin: 0 }}>
            {result.message}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, weight }: { label: string; value: string; weight: string }) {
  return (
    <div style={{
      background: '#f9fafb',
      padding: '25px',
      borderRadius: '12px',
      textAlign: 'center',
      border: '2px solid #e5e7eb'
    }}>
      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '10px', fontWeight: '600' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
        {weight}
      </div>
    </div>
  );
}

function PlayerCard({ label, username, type }: { label: string; username: string; type: string }) {
  return (
    <div style={{
      background: '#f9fafb',
      padding: '25px',
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '10px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
        {username}
      </div>
      <div style={{
        display: 'inline-block',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '8px 20px',
        borderRadius: '20px',
        fontSize: '1rem',
        fontWeight: '600'
      }}>
        {type}
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score > 0.8) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  if (score > 0.65) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
  if (score > 0.5) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
}