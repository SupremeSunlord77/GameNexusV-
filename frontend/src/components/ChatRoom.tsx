import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatRoomProps {
  lobbyId: string;
  username: string;
  onLeave: () => void;
}

interface Message {
  username: string;
  message: string;
  content?: string;
  isToxic?: boolean;
  createdAt?: Date;
}

const ChatRoom = ({ lobbyId, username, onLeave }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [currentReputation, setCurrentReputation] = useState(
    Number(localStorage.getItem('userReputation')) || 50
  );

  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'positive' | 'negative' | 'neutral';
  }>({ show: false, message: '', type: 'neutral' });

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    socketRef.current.emit("join_lobby", lobbyId);

    socketRef.current.on("load_history", (history: any[]) => {
      const formatted = history.map(msg => ({
        username: msg.user.username,
        message: msg.content,
        isToxic: msg.isToxic || false
      }));
      setMessages(formatted);
    });

    socketRef.current.on("receive_message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    // 🔥 FIXED: Added defensive checks
    socketRef.current.on("reputation_update", (data: any) => {
      console.log('📊 Reputation update received:', data);
      
      // Handle both object and number formats
      let newScore: number;
      let change: number = 0;
      let reason: string = '';
      
      if (typeof data === 'number') {
        // Old format: just the score
        newScore = data;
      } else if (typeof data === 'object' && data !== null) {
        // New format: { newScore, change, reason }
        newScore = data.newScore || data.score || currentReputation;
        change = data.change || 0;
        reason = data.reason || '';
      } else {
        console.error('Invalid reputation update format:', data);
        return;
      }
      
      // Update reputation state
      setCurrentReputation(newScore);
      localStorage.setItem('userReputation', String(newScore));
      
      // Show toast notification
      if (change > 0) {
        showToast(
          `+${change} Rep: ${reason} (${newScore}/100)`,
          'positive'
        );
      } else if (change < 0) {
        showToast(
          `${change} Rep: ${reason} (${newScore}/100)`,
          'negative'
        );
      } else if (reason) {
        showToast(
          `${reason} (${newScore}/100)`,
          'neutral'
        );
      }
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.off("load_history");
        socketRef.current.off("receive_message");
        socketRef.current.off("reputation_update");
        socketRef.current.disconnect();
      }
    };
  }, [lobbyId]);

  // Separate effect for auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Toast notification helper
  const showToast = (message: string, type: 'positive' | 'negative' | 'neutral') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'neutral' });
    }, 3000);
  };

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      lobbyId,
      userId,
      message: input
    });

    setInput('');
  };

  const getReputationColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 30) return '#f59e0b';
    return '#ef4444';
  };

  const getReputationEmoji = (score: number) => {
    if (score >= 70) return '😊';
    if (score >= 30) return '😐';
    return '😠';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          zIndex: 1000,
          background: toast.type === 'positive' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : toast.type === 'negative'
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontWeight: '600',
          fontSize: '14px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'positive' && '✨ '}
          {toast.type === 'negative' && '⚠️ '}
          {toast.type === 'neutral' && '💬 '}
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div style={{ 
        padding: '15px', 
        background: '#34495e', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Lobby: {lobbyId.substring(0, 8)}...</h3>
        </div>
        
        {/* REPUTATION DISPLAY */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '8px 16px', 
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {getReputationEmoji(currentReputation)}
          </span>
          <div>
            <div style={{ fontSize: '10px', opacity: 0.8, textAlign: 'center' }}>
              Your Reputation
            </div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: getReputationColor(currentReputation)
            }}>
              {currentReputation}/100
            </div>
          </div>
        </div>
        
        <button onClick={onLeave} style={{ 
          background: '#ef4444', 
          color: 'white', 
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          Leave
        </button>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#ecf0f1', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.username === "You" || msg.username === username;
          const isToxic = msg.isToxic || false;
          
          return (
            <div key={idx} style={{ 
              marginBottom: '14px', 
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              textAlign: isMe ? 'right' : 'left',
              maxWidth: '75%'
            }}>
              
              {/* TOXIC WARNING */}
              {isToxic && (
                <div style={{
                  background: '#fee2e2',
                  border: '2px solid #ef4444',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  fontSize: '13px',
                  color: '#991b1b',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                }}>
                  ⚠️ Toxic message detected
                </div>
              )}
              
              {/* MESSAGE BUBBLE */}
              <div style={{ 
                background: isToxic 
                  ? '#fca5a5'
                  : (isMe ? '#3498db' : '#bdc3c7'),
                color: isToxic 
                  ? '#7f1d1d'
                  : (isMe ? 'white' : 'black'),
                padding: '10px 14px', 
                borderRadius: '16px',
                display: 'inline-block',
                border: isToxic ? '2px solid #dc2626' : 'none',
                boxShadow: isToxic 
                  ? '0 2px 8px rgba(239, 68, 68, 0.3)'
                  : '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}>
                {isToxic && <span style={{ fontSize: '16px', marginRight: '6px' }}>⚠️</span>}
                <strong>{msg.username}: </strong>
                {msg.message || msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: '15px', display: 'flex', gap: '10px' }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message... (Nice messages gain reputation!)" 
          style={{ 
            flex: 1, 
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc'
          }}
        />
        <button 
          onClick={sendMessage} 
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          Send
        </button>
      </div>

      {/* CSS ANIMATION */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatRoom;