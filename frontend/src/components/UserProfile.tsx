import { useEffect, useState } from 'react';
import api from '../services/api';

const UserProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/profile/${userId}`);
        setProfile(res.data.user);
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    };
    fetchProfile();
  }, [userId]);

  if (!profile) return <p>Loading Profile...</p>;

  return (
    <div style={{ background: 'white', padding: '40px', borderRadius: '10px', maxWidth: '600px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ width: '100px', height: '100px', background: '#3498db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '40px', color: 'white' }}>
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ color: '#2c3e50', marginBottom: '5px' }}>{profile.username}</h2>
        <p style={{ color: '#7f8c8d', margin: 0 }}>{profile.email}</p>
      </div>

      <div style={{ borderTop: '1px solid #ecf0f1', paddingTop: '20px' }}>
        <h3 style={{ color: '#2c3e50' }}>About Me</h3>
        <p style={{ color: '#34495e', lineHeight: '1.6' }}>
          {profile.bio || "This user hasn't written a bio yet."}
        </p>
        
        <div style={{ marginTop: '20px' }}>
            <strong>Member Since:</strong> {new Date(profile.createdAt).toLocaleDateString()}
        </div>
      </div>
      
      <button style={{ marginTop: '30px', padding: '10px 20px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Edit Profile (Coming Soon)
      </button>
    </div>
  );
};

export default UserProfile;