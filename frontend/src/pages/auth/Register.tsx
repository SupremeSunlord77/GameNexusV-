import { useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', { username, email, password });
      
      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('assessmentCompleted', 'false'); // Mark as not completed
      
      // Redirect to behavioral assessment
      navigate('/assessment');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>GameNexus</h1>
        <h2 style={styles.subtitle}>Sign Up</h2>
        
        <form onSubmit={handleRegister}>
          <div style={styles.inputGroup}>
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <input 
              type="password" 
              placeholder="Password" 
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Login here</Link>
        </p>
        
        {/* Info Box */}
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            📝 After registration, you'll complete a quick behavioral assessment 
            to help us match you with compatible players!
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    position: 'fixed',
    top: 0,
    left: 0,
    margin: 0,
    padding: 0
  },
  card: {
    backgroundColor: '#242424',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid #333',
  },
  logo: {
    color: '#646cff',
    fontSize: '32px',
    marginBottom: '10px',
    marginTop: 0,
    fontWeight: 'bold'
  },
  subtitle: {
    color: 'white',
    fontSize: '18px',
    marginBottom: '30px',
    marginTop: 0,
    fontWeight: 'bold'
  },
  inputGroup: {
    marginBottom: '15px',
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: '5px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#646cff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  errorMessage: {
    color: '#ff4444',
    fontSize: '14px',
    marginBottom: '15px',
    backgroundColor: 'rgba(255,0,0,0.1)',
    padding: '10px',
    borderRadius: '5px'
  },
  footerText: {
    marginTop: '20px',
    color: '#aaa',
    fontSize: '14px'
  },
  link: {
    color: '#646cff',
    textDecoration: 'none',
    fontWeight: 'bold'
  },
  infoBox: {
    marginTop: '20px',
    padding: '12px',
    background: 'rgba(100, 108, 255, 0.1)',
    border: '1px solid rgba(100, 108, 255, 0.3)',
    borderRadius: '8px',
  },
  infoText: {
    margin: 0,
    fontSize: '12px',
    color: '#aaa',
    lineHeight: '1.5',
  }
};

export default Register;