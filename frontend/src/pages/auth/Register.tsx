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
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('assessmentCompleted', 'false');
      navigate('/assessment');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.orb1} />
      <div style={s.orb2} />

      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>⚡</div>
          <span style={s.logoText}>GameNexus</span>
        </div>

        <h2 style={s.title}>Create your account</h2>
        <p style={s.subtitle}>Join the nexus — find your perfect squad</p>

        <form onSubmit={handleRegister} style={{ marginTop: 28 }}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input
              type="text"
              placeholder="ProGamer123"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              placeholder="player@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={s.input}
            />
          </div>

          {error && (
            <div style={s.error}><span>⚠</span> {error}</div>
          )}

          <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={s.spinner} /> Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div style={s.infoBox}>
          <span style={s.infoIcon}>🧬</span>
          <span style={s.infoText}>
            After sign-up you'll complete a quick behavioral assessment to power your player matching.
          </span>
        </div>

        <p style={s.footer}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', width: '100vw',
    background: 'radial-gradient(ellipse at 80% 20%, #0a1628 0%, #06060f 60%)',
    position: 'fixed', top: 0, left: 0, overflow: 'hidden',
  },
  orb1: {
    position: 'fixed', width: 450, height: 450, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
    bottom: '-10%', left: '-5%', pointerEvents: 'none',
  },
  orb2: {
    position: 'fixed', width: 350, height: 350, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)',
    top: '-5%', right: '-5%', pointerEvents: 'none',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24, padding: '44px 40px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    position: 'relative', zIndex: 1,
    animation: 'fadeIn 0.4s ease',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoIcon: {
    width: 40, height: 40, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
  },
  logoText: { fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' },
  title: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', margin: 0 },
  field: { marginBottom: 18 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 },
  input: {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#f1f5f9', fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', padding: '10px 14px', borderRadius: 8,
    fontSize: 13, marginBottom: 16,
  },
  btn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
  },
  spinner: {
    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', display: 'inline-block',
  },
  infoBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
    borderRadius: 10, padding: '12px 14px', marginTop: 20,
  },
  infoIcon: { fontSize: 18, flexShrink: 0 },
  infoText: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5 },
  footer: { textAlign: 'center', color: '#475569', fontSize: 14, marginTop: 20, marginBottom: 0 },
  link: { color: '#a78bfa', fontWeight: 700 },
};

export default Register;
