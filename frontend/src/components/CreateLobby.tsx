import { useState } from 'react';
import api from '../services/api';

interface CreateLobbyProps {
  onSuccess: () => void; // Function to run after creating lobby (e.g., go back home)
  onCancel: () => void;
}

const CreateLobby = ({ onSuccess, onCancel }: CreateLobbyProps) => {
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Backend expects: { title, game, maxPlayers, description }
      await api.post('/lfg', { 
        title, 
        game, 
        maxPlayers: Number(maxPlayers),
        description: "Let's play!" 
      });
      alert('Lobby Created! 🎮');
      onSuccess();
    } catch (err) {
      alert('Failed to create lobby');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', padding: '30px', borderRadius: '10px', maxWidth: '500px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#2c3e50', marginTop: 0 }}>Create New Lobby</h2>
      <form onSubmit={handleSubmit}>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Lobby Title</label>
          <input 
            type="text" 
            placeholder="e.g., Rank Push Gold to Plat"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Game Name</label>
          <input 
            type="text" 
            placeholder="e.g., Valorant, COD, Minecraft"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max Players</label>
          <input 
            type="number" 
            min="2" max="10"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={onCancel}
            style={{ flex: 1, padding: '10px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            style={{ flex: 1, padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            {loading ? 'Creating...' : 'Create Lobby'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateLobby;