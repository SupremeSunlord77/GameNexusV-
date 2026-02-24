import { useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('userRole', response.data.user.role);
      
      // Check if user has completed behavioral assessment
      try {
        const profileResponse = await api.get(`/behavioral/profile/${response.data.user.id}`);
        
        if (profileResponse.data && profileResponse.data.behavioralVectors) {
          // User has completed assessment
          localStorage.setItem('assessmentCompleted', 'true');
          
          // Route based on role
          if (response.data.user.role === 'ADMIN') {
            navigate('/admin');
          } else if (response.data.user.role === 'MODERATOR') {
            navigate('/moderator');
          } else {
            navigate('/dashboard');
          }
        } else {
          // User hasn't completed assessment
          localStorage.setItem('assessmentCompleted', 'false');
          navigate('/assessment');
        }
      } catch (profileErr) {
        // Profile doesn't exist, needs assessment
        localStorage.setItem('assessmentCompleted', 'false');
        navigate('/assessment');
      }
    } catch (err: any) {
      setError('Invalid email or password');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>👾 GameNexus</h1>
        <h2 style={styles.subtitle}>Welcome Back</h2>
        
        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input 
              type="email" 
              placeholder="player@example.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={styles.input}
            />
          </div>

          {error && <div style={styles.errorMessage}>⚠️ {error}</div>}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{...styles.button, opacity: loading ? 0.7 : 1}}
          >
            {loading ? 'Entering Nexus...' : 'Log In'}
          </button>
        </form>

        <p style={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    width: '100vw', height: '100vh',
    backgroundColor: '#1a1a1a', fontFamily: "'Inter', sans-serif",
    margin: 0, padding: 0, position: 'fixed', top: 0, left: 0
  },
  card: {
    backgroundColor: '#242424', padding: '40px', borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', width: '100%', maxWidth: '400px',
    textAlign: 'center', border: '1px solid #333',
  },
  logo: { color: '#646cff', fontSize: '28px', marginBottom: '8px', marginTop: 0 },
  subtitle: { color: '#a1a1aa', fontSize: '16px', fontWeight: '400', marginBottom: '32px', marginTop: 0 },
  
  inputGroup: { marginBottom: '20px', textAlign: 'center' },
  
  label: { display: 'block', color: '#e4e4e7', marginBottom: '8px', fontSize: '14px', fontWeight: '500' },
  
  input: {
    width: '100%', padding: '12px 16px', backgroundColor: '#333', border: '1px solid #444',
    borderRadius: '8px', color: 'white', fontSize: '16px', outline: 'none', 
    boxSizing: 'border-box', textAlign: 'center'
  },
  
  button: {
    width: '100%', padding: '14px', backgroundColor: '#646cff', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600',
    cursor: 'pointer', marginTop: '10px', transition: 'background-color 0.2s',
  },
  
  errorMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px',
    borderRadius: '6px', fontSize: '14px', marginBottom: '20px', textAlign: 'center'
  },
  
  footerText: { marginTop: '24px', color: '#71717a', fontSize: '14px' },
  link: { color: '#646cff', textDecoration: 'none', fontWeight: '600' }
};

export default Login;