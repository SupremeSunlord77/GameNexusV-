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

  // Editable fields
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
        
        // Fetch regular profile
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

        // Fetch behavioral profile
        if (userId) {
          try {
            const behavioralRes = await api.get(`/behavioral/profile/${userId}`);
            if (behavioralRes.data && !behavioralRes.data.needsAssessment) {
              setBehavioralProfile(behavioralRes.data);
            }
          } catch (err) {
            console.log("No behavioral profile yet");
          }
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/profile/me", {
        displayName,
        bio,
        region,
        primaryLanguage,
        playStyle,
        communicationPref
      });
      setProfile(res.data);
      setEditing(false);
    } catch (err) {
      console.error("Error saving profile", err);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading Profile...</p>;
  if (!user) return <p>Profile not found</p>;

  return (
    <div style={card}>
      {/* Avatar + identity */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={avatar}>
          {(user.username || "U").charAt(0).toUpperCase()}
        </div>
        <h2 style={{ marginBottom: 5 }}>{user.username}</h2>
        <p style={{ color: "#7f8c8d", margin: 0 }}>{user.email}</p>
      </div>

      <div style={divider} />

      {/* Behavioral Profile Section */}
      {behavioralProfile && behavioralProfile.radarChartData && (
        <BehavioralRadar 
          radarData={behavioralProfile.radarChartData}
          bartleType={behavioralProfile.gamerDNA?.bartleType}
        />
      )}

      {!behavioralProfile && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#92400e' }}>
            🧬 Complete your Behavioral Assessment to see your Gamer DNA!
          </p>
        </div>
      )}

      <div style={divider} />

      {/* Profile content */}
      {editing ? (
        <>
          <Field label="Display Name">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </Field>

          <Field label="Bio">
            <textarea value={bio} onChange={e => setBio(e.target.value)} />
          </Field>

          <Field label="Region">
            <select value={region} onChange={e => setRegion(e.target.value)}>
              <option value="Asia">Asia</option>
              <option value="EU">Europe</option>
              <option value="NA">North America</option>
            </select>
          </Field>

          <Field label="Primary Language">
            <input
              value={primaryLanguage}
              onChange={e => setPrimaryLanguage(e.target.value)}
            />
          </Field>

          <Field label="Play Style">
            <select value={playStyle} onChange={e => setPlayStyle(e.target.value)}>
              <option value="CASUAL">Casual</option>
              <option value="COMPETITIVE">Competitive</option>
              <option value="HARDCORE">Hardcore</option>
            </select>
          </Field>

          <Field label="Communication Preference">
            <select
              value={communicationPref}
              onChange={e => setCommunicationPref(e.target.value)}
            >
              <option value="VOICE">Voice</option>
              <option value="TEXT">Text</option>
              <option value="PING_ONLY">Ping Only</option>
            </select>
          </Field>

          <div style={actions}>
            <button onClick={() => setEditing(false)}>Cancel</button>
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>About Me</h3>
          <p>{profile?.bio || "This user hasn't written a bio yet."}</p>

          <div style={{ marginTop: 15 }}>
            <strong>Region:</strong> {profile?.region || "—"}
          </div>
          <div>
            <strong>Play Style:</strong> {profile?.playStyle || "—"}
          </div>
          <div>
            <strong>Communication:</strong> {profile?.communicationPref || "—"}
          </div>

          <div style={{ marginTop: 20 }}>
            <strong>Member Since:</strong>{" "}
            {new Date(user.createdAt).toLocaleDateString()}
          </div>

          <button style={editBtn} onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        </>
      )}
    </div>
  );
};

/* ---------- Small UI helpers ---------- */

const Field = ({ label, children }: any) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontWeight: "bold", fontSize: 14 }}>{label}</label>
    <div>{children}</div>
  </div>
);

/* ---------- Styles ---------- */

const card: React.CSSProperties = {
  background: "white",
  padding: 40,
  borderRadius: 10,
  maxWidth: 800,
  margin: "40px auto",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
};

const avatar: React.CSSProperties = {
  width: 100,
  height: 100,
  background: "#3498db",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  fontSize: 40,
  color: "white"
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #ecf0f1",
  margin: "20px 0"
};

const actions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20
};

const editBtn: React.CSSProperties = {
  marginTop: 30,
  padding: "10px 20px",
  background: "#f39c12",
  color: "white",
  border: "none",
  borderRadius: 5,
  cursor: "pointer"
};

export default UserProfile;