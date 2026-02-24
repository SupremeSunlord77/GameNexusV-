import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';

interface ChatRoomProps {
  lobbyId: string;
  hostUserId: string;
  username: string;
  onLeave: () => void;
}

interface Message {
  username: string;
  message: string;
  content?: string;
}

const ChatRoom = ({ lobbyId, hostUserId, username, onLeave }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [closedBanner, setClosedBanner] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = localStorage.getItem('userId') || '';
  const isHost = userId === hostUserId;

  useEffect(() => {
    // Connect
    socketRef.current = io("http://localhost:5000");
    socketRef.current.emit("join_lobby", lobbyId);

    // Load History
    socketRef.current.on("load_history", (history: any[]) => {
      const formatted = history.map(msg => ({
        username: msg.user.username,
        message: msg.content
      }));
      setMessages(formatted);
    });

    // Receive Message
    socketRef.current.on("receive_message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    // Session closed by host or auto-triggered
    socketRef.current.on("session_closed", () => {
      setClosedBanner("This lobby has been closed.");
      setTimeout(() => onLeave(), 2500);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [lobbyId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      lobbyId,
      userId,
      message: input
    });

    setInput('');
  };

  const handleLeave = async () => {
    try {
      await api.post('/lfg/leave', { sessionId: lobbyId });
    } catch (err) {
      console.error("Leave failed:", err);
    }
    socketRef.current?.disconnect();
    onLeave();
  };

  const handleClose = async () => {
    try {
      await api.patch(`/lfg/sessions/${lobbyId}/close`);
      // session_closed socket event will trigger the redirect for all users
    } catch (err) {
      console.error("Close failed:", err);
      onLeave(); // fallback
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: '10px', overflow: 'hidden' }}>

      {/* CLOSED BANNER */}
      {closedBanner && (
        <div style={{ padding: '10px', background: '#ef4444', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {closedBanner}
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: '15px', background: '#34495e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Lobby: {lobbyId}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isHost ? (
            <button
              onClick={handleClose}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', padding: '6px 12px', cursor: 'pointer' }}
            >
              Close Lobby
            </button>
          ) : (
            <button
              onClick={handleLeave}
              style={{ background: '#64748b', color: 'white', border: 'none', borderRadius: '5px', padding: '6px 12px', cursor: 'pointer' }}
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#ecf0f1', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.username === "You" || msg.username === username;

          return (
            <div key={idx} style={{
              marginBottom: '10px',
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              textAlign: isMe ? 'right' : 'left'
            }}>
              <div style={{
                background: isMe ? '#3498db' : '#bdc3c7',
                color: isMe ? 'white' : 'black',
                padding: '8px 12px',
                borderRadius: '15px',
                display: 'inline-block'
              }}>
                <strong>{msg.username}: </strong>{msg.message || msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: '15px', display: 'flex' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px' }}
        />
        <button onClick={sendMessage} style={{ padding: '10px 20px', cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  );
};

export default ChatRoom;
