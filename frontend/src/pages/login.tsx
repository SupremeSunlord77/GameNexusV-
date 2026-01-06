import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use the email/password you created in Postman!
      const response = await api.post('/auth/login', { email, password });
      
      // Save the token so the app remembers you
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      
      alert('Login Successful! 🔓');
      navigate('/dashboard'); 
    } catch (err: any) {
      setError('Invalid email or password');
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <div style={{ border: '1px solid #ccc', padding: '40px', borderRadius: '10px', textAlign: 'center', width: '300px' }}>
        <h1 style={{ color: '#646cff' }}>GameNexus</h1>
        <h2>Login</h2>
        
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            placeholder="Email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          
          <input 
            type="password" 
            placeholder="Password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
          />

          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
          
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Enter Nexus
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;