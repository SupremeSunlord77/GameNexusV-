import { useEffect, useState } from "react";
import api from "../services/api";
import BehavioralRadar from "./BehavioralRadar";

const UserProfile = () => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [behavioralProfile, setBehavioralProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [region, setRegion] = useState("Asia");
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [playStyle, setPlayStyle] = useState("CASUAL");
  const [communicationPref, setCommunicationPref] = useState("VOICE");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const res = await api.get("/profile/me");
        setUser(res.data.user);
        setProfile(res.data.profile);
        if (res.data.profile) {
          setDisplayName(res.data.profile.displayName || "");
          setBio(res.data.profile.bio || "");
          setRegion(res.data.profile.region);
          setPrimaryLanguage(res.data.profile.primaryLanguage);
          setPlayStyle(res.data.profile.playStyle);
          setCommunicationPref(res.data.profile.communicationPref);
        }
        if (userId) {
          try {
            const br = await api.get(`/behavioral/profile/${userId}`);
            if (br.data && !br.data.needsAssessment) setBehavioralProfile(br.data);
          } catch { /* no behavioral profile yet */ }
        }
      } catch (err) { console.error("Error fetching profile", err); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/profile/me", { displayName, bio, region, primaryLanguage, playStyle, communicationPref });
      setProfile(res.data);
      setEditing(false);
    } catch { alert("Failed to update profile"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={s.center}><div style={s.spinner} /></div>
  );
  if (!user) return (
    <div style={s.center}><p style={{ color: '#94a3b8' }}>Profile not found</p></div>
  );

  const hue = user.username.charCodeAt(0) * 17 % 360;
  const avatarGrad = `hsl(${hue}, 60%, 35%)`;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 800 }}>
      {/* Profile card */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={{ ...s.avatar, background: avatarGrad }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={s.username}>{profile?.displayName || user.username}</h2>
            {profile?.displayName && <div style={s.handle}>@{user.username}</div>}
            <div style={s.email}>{user.email}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {profile?.playStyle && <Chip color="#a78bfa">{profile.playStyle}</Chip>}
              {profile?.region && <Chip color="#22d3ee">{profile.region}</Chip>}
              {profile?.communicationPref && <Chip color="#10b981">{profile.communicationPref}</Chip>}
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ ...s.editBtn, marginLeft: 'auto', alignSelf: 'flex-start' }}>
              Edit Profile
            </button>
          )}
        </div>

        {!editing && (
          <div style={s.bio}>{profile?.bio || <span style={{ color: '#475569', fontStyle: 'italic' }}>No bio yet.</span>}</div>
        )}

        {editing && (
          <div style={s.editForm}>
            <div style={s.formGrid}>
              <FormField label="Display Name">
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={s.input} placeholder="Display name" />
              </FormField>
              <FormField label="Primary Language">
                <input value={primaryLanguage} onChange={e => setPrimaryLanguage(e.target.value)} style={s.input} />
              </FormField>
              <FormField label="Region">
                <select value={region} onChange={e => setRegion(e.target.value)} style={s.input}>
                  <option>Asia</option><option value="EU">Europe</option><option value="NA">North America</option>
                </select>
              </FormField>
              <FormField label="Play Style">
                <select value={playStyle} onChange={e => setPlayStyle(e.target.value)} style={s.input}>
                  <option value="CASUAL">Casual</option><option value="COMPETITIVE">Competitive</option><option value="HARDCORE">Hardcore</option>
                </select>
              </FormField>
              <FormField label="Communication">
                <select value={communicationPref} onChange={e => setCommunicationPref(e.target.value)} style={s.input}>
                  <option value="VOICE">Voice</option><option value="TEXT">Text</option><option value="PING_ONLY">Ping Only</option>
                </select>
              </FormField>
            </div>
            <FormField label="Bio">
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...s.input, resize: 'vertical' }} placeholder="Tell others about yourself..." />
            </FormField>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setEditing(false)} style={s.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Behavioral DNA card */}
      {behavioralProfile?.radarChartData ? (
        <div style={s.card}>
          <h3 style={s.sectionTitle}>🧬 Gamer DNA</h3>
          <BehavioralRadar
            radarData={behavioralProfile.radarChartData}
            bartleType={behavioralProfile.gamerDNA?.bartleType}
          />
        </div>
      ) : (
        <div style={s.assessmentPrompt}>
          <span style={{ fontSize: 32 }}>🧬</span>
          <div>
            <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Complete Your Behavioral Assessment</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Unlock Gamer DNA profile and better match scores</div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormField = ({ label, children }: any) => (
  <div style={{ marginBottom: 0 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const Chip = ({ children, color }: any) => (
  <span style={{
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
    background: `${color}22`, color, border: `1px solid ${color}44`,
  }}>{children}</span>
);

const s: Record<string, React.CSSProperties> = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 },
  spinner: {
    width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  card: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
    padding: '28px', marginBottom: 20,
  },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0,
  },
  username: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 },
  handle: { fontSize: 13, color: '#475569', marginBottom: 2 },
  email: { fontSize: 13, color: '#64748b' },
  bio: { fontSize: 14, color: '#94a3b8', lineHeight: 1.6, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' },
  editForm: { borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginTop: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', marginBottom: 14 },
  input: {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' as const,
  },
  editBtn: {
    padding: '8px 16px', background: 'rgba(167,139,250,0.1)',
    border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8,
    color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    padding: '9px 18px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 18px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 },
  assessmentPrompt: {
    display: 'flex', alignItems: 'center', gap: 16,
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 16, padding: '20px 24px',
  },
};

export default UserProfile;
