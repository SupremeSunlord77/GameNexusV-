import { useEffect, useState } from 'react';
import api from '../../services/api';
import ReputationMeter from '../../components/ReputationMeter';

const Settings = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const res = await api.get(`/profile/${userId}`);
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to load user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Failed to load user data</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>⚙️ Settings</h1>

        {/* User Info Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account Information</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Username:</span>
              <span style={styles.infoValue}>{user.username}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email:</span>
              <span style={styles.infoValue}>{user.email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Role:</span>
              <span style={styles.roleChip}>{user.role}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Member Since:</span>
              <span style={styles.infoValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Reputation Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Behavioral Reputation</h2>
          <div style={styles.reputationContainer}>
            <ReputationMeter score={user.reputation || 50} />
            
            <div style={styles.reputationInfo}>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Current Score</div>
                <div style={styles.statValue}>{user.reputation || 50}/100</div>
              </div>
              
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Toxicity Flags</div>
                <div style={{
                  ...styles.statValue,
                  color: (user.toxicityFlags || 0) > 0 ? '#ef4444' : '#22c55e'
                }}>
                  {user.toxicityFlags || 0}
                </div>
              </div>
              
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Status</div>
                <div style={{
                  ...styles.statValue,
                  color: user.isBanned ? '#ef4444' : '#22c55e'
                }}>
                  {user.isBanned ? 'Banned' : 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Reputation Guide */}
          <div style={styles.guideBox}>
            <h3 style={styles.guideTitle}>📊 How Reputation Works</h3>
            <ul style={styles.guideList}>
              <li>
                <strong style={{ color: '#22c55e' }}>70-100 (Excellent):</strong> Positive 
                messages increase reputation. Keep it up!
              </li>
              <li>
                <strong style={{ color: '#f59e0b' }}>30-69 (Neutral):</strong> Mixed behavior. 
                Be mindful of your communication.
              </li>
              <li>
                <strong style={{ color: '#ef4444' }}>&lt;30 (Critical):</strong> Multiple toxic 
                messages detected. Risk of ban.
              </li>
            </ul>
            <p style={styles.guideNote}>
              💡 <strong>Tip:</strong> Our AI analyzes every message in real-time. Positive 
              messages earn +1 point, toxic messages lose -5 points.
            </p>
          </div>
        </div>

        {/* Preferences Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Preferences</h2>
          <div style={styles.preferencesList}>
            <div style={styles.preferenceItem}>
              <div>
                <div style={styles.preferenceLabel}>Email Notifications</div>
                <div style={styles.preferenceDesc}>
                  Receive updates about your sessions
                </div>
              </div>
              <label style={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span style={styles.slider}></span>
              </label>
            </div>

            <div style={styles.preferenceItem}>
              <div>
                <div style={styles.preferenceLabel}>Chat Notifications</div>
                <div style={styles.preferenceDesc}>
                  Get notified of new messages
                </div>
              </div>
              <label style={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span style={styles.slider}></span>
              </label>
            </div>

            <div style={styles.preferenceItem}>
              <div>
                <div style={styles.preferenceLabel}>Show Reputation Publicly</div>
                <div style={styles.preferenceDesc}>
                  Let others see your behavior score
                </div>
              </div>
              <label style={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span style={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={styles.section}>
          <h2 style={{ ...styles.sectionTitle, color: '#ef4444' }}>Danger Zone</h2>
          <div style={styles.dangerBox}>
            <div>
              <div style={styles.dangerTitle}>Delete Account</div>
              <div style={styles.dangerDesc}>
                Permanently delete your account and all associated data
              </div>
            </div>
            <button style={styles.dangerButton}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  heading: {
    margin: '0 0 32px 0',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginBottom: '40px',
    paddingBottom: '32px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: '16px',
    color: '#1f2937',
    fontWeight: '600',
  },
  roleChip: {
    display: 'inline-block',
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    width: 'fit-content',
  },
  reputationContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  reputationInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statBox: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  guideBox: {
    background: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '24px',
  },
  guideTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginTop: '0',
    marginBottom: '12px',
  },
  guideList: {
    margin: '0 0 16px 0',
    paddingLeft: '20px',
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  guideNote: {
    margin: '0',
    fontSize: '14px',
    color: '#1e40af',
    background: 'white',
    padding: '12px',
    borderRadius: '6px',
  },
  preferencesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  preferenceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
  },
  preferenceLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  preferenceDesc: {
    fontSize: '14px',
    color: '#6b7280',
  },
  switch: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '48px',
    height: '24px',
  },
  slider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#cbd5e1',
    borderRadius: '24px',
    transition: '0.4s',
  },
  dangerBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
  },
  dangerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: '4px',
  },
  dangerDesc: {
    fontSize: '14px',
    color: '#7f1d1d',
  },
  dangerButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default Settings;