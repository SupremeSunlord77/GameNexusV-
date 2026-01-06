import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatRoomProps {
  lobbyId: string;
  username: string; // <--- NEW: We need this to know who "Me" is
  onLeave: () => void;
}

interface Message {
  username: string;
  message: string;
  content?: string; 
}

const ChatRoom = ({ lobbyId, username, onLeave }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = localStorage.getItem('userId');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div style={{ padding: '15px', background: '#34495e', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
        <h3>Lobby: {lobbyId}</h3>
        <button onClick={onLeave} style={{ color: 'black', cursor: 'pointer' }}>Leave</button>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#ecf0f1', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, idx) => {
          // Check if the message is from me
          const isMe = msg.username === "You" || msg.username === username;
          
          return (
            <div key={idx} style={{ 
              marginBottom: '10px', 
              alignSelf: isMe ? 'flex-end' : 'flex-start', // Right if me, Left if others
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