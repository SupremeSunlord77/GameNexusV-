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
      } catch (err) { console.error('Failed to load user data:', err); }
      finally { setLoading(false); }
    };
    fetchUserData();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={s.spinner} />
    </div>
  );
  if (!user) return <p style={{ color: '#94a3b8' }}>Failed to load user data</p>;

  const repColor = user.reputation >= 70 ? '#10b981' : user.reputation >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ maxWidth: 760, animation: 'fadeIn 0.3s ease' }}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Settings</h1>
        <p style={s.pageSubtitle}>Manage your account and preferences</p>
      </div>

      {/* Account Info */}
      <Section title="Account Information" icon="👤">
        <div style={s.infoGrid}>
          <InfoItem label="Username" value={user.username} />
          <InfoItem label="Email" value={user.email} />
          <InfoItem label="Role" value={
            <span style={{ ...s.chip, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
              {user.role}
            </span>
          } />
          <InfoItem label="Member Since" value={new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
        </div>
      </Section>

      {/* Reputation */}
      <Section title="Behavioral Reputation" icon="📊">
        <div style={s.statRow}>
          <StatCard label="Reputation Score" value={`${user.reputation || 50}`} sub="/100" color={repColor} />
          <StatCard label="Toxicity Flags" value={`${user.toxicityFlags || 0}`} sub="flags" color={(user.toxicityFlags || 0) > 0 ? '#ef4444' : '#10b981'} />
          <StatCard label="Account Status" value={user.isBanned ? 'Banned' : 'Active'} sub="" color={user.isBanned ? '#ef4444' : '#10b981'} />
        </div>
        <ReputationMeter score={user.reputation || 50} />
        <div style={s.guideBox}>
          <div style={s.guideTitle}>How Reputation Works</div>
          <div style={s.guideRows}>
            <GuideRow color="#10b981" range="70–100" label="Excellent" desc="Positive messages earn +1 rep. Keep it up!" />
            <GuideRow color="#f59e0b" range="30–69" label="Neutral" desc="Mixed behavior. Be mindful of your communication." />
            <GuideRow color="#ef4444" range="0–29" label="Critical" desc="Multiple toxic messages detected. Risk of ban." />
          </div>
          <div style={s.guideTip}>
            💡 Our AI analyzes every message in real-time. Positive messages +1, toxic messages −5.
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences" icon="🔔">
        <div style={s.prefList}>
          <PrefRow label="Email Notifications" desc="Receive updates about your sessions" defaultOn />
          <PrefRow label="Chat Notifications" desc="Get notified of new messages" defaultOn />
          <PrefRow label="Show Reputation Publicly" desc="Let others see your behavior score" defaultOn />
        </div>
      </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone" icon="⚠️" danger>
        <div style={s.dangerBox}>
          <div>
            <div style={s.dangerTitle}>Delete Account</div>
            <div style={s.dangerDesc}>Permanently delete your account and all associated data. This cannot be undone.</div>
          </div>
          <button style={s.dangerBtn}>Delete Account</button>
        </div>
      </Section>
    </div>
  );
};

const Section = ({ title, icon, children, danger }: any) => (
  <div style={{ ...sSection.wrap, ...(danger ? { borderColor: 'rgba(239,68,68,0.2)' } : {}) }}>
    <div style={sSection.header}>
      <span style={sSection.icon}>{icon}</span>
      <h2 style={{ ...sSection.title, ...(danger ? { color: '#f87171' } : {}) }}>{title}</h2>
    </div>
    {children}
  </div>
);
const sSection = {
  wrap: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '24px', marginBottom: 16,
  } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 } as React.CSSProperties,
  icon: { fontSize: 18 } as React.CSSProperties,
  title: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 } as React.CSSProperties,
};

const InfoItem = ({ label, value }: any) => (
  <div>
    <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 15, color: '#f1f5f9', fontWeight: 600 }}>{value}</div>
  </div>
);

const StatCard = ({ label, value, sub, color }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px', textAlign: 'center' as const }}>
    <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}<span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{sub}</span></div>
  </div>
);

const GuideRow = ({ color, range, label, desc }: any) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
    <div>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{range} — {label}: </span>
      <span style={{ fontSize: 13, color: '#64748b' }}>{desc}</span>
    </div>
  </div>
);

const PrefRow = ({ label, desc, defaultOn }: any) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#475569' }}>{desc}</div>
      </div>
      <div
        onClick={() => setOn(!on)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
          background: on ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.3s',
        }}
      >
        <div style={{
          position: 'absolute', width: 18, height: 18, background: '#fff',
          borderRadius: '50%', top: 3, left: on ? 23 : 3, transition: 'left 0.3s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  spinner: {
    width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#475569', margin: 0 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' },
  chip: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 },
  guideBox: {
    marginTop: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: '16px 20px',
  },
  guideTitle: { fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  guideRows: { marginBottom: 12 },
  guideTip: { fontSize: 12, color: '#475569', lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' },
  prefList: {},
  dangerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 },
  dangerTitle: { fontSize: 15, fontWeight: 700, color: '#f87171', marginBottom: 4 },
  dangerDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.5 },
  dangerBtn: {
    padding: '10px 20px', background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
    color: '#f87171', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};

export default Settings;
