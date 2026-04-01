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
  isToxic?: boolean;
  createdAt?: Date;
}

const ChatRoom = ({ lobbyId, hostUserId, username, onLeave }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [closedBanner, setClosedBanner] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentReputation, setCurrentReputation] = useState(
    Number(localStorage.getItem('userReputation')) || 50
  );
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'positive' | 'negative' | 'neutral' }>({ show: false, message: '', type: 'neutral' });

  const userId = localStorage.getItem('userId') || '';
  const isHost = userId === hostUserId;

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    socketRef.current.emit("join_lobby", lobbyId);

    socketRef.current.on("load_history", (history: any[]) => {
      setMessages(history.map(msg => ({ username: msg.user.username, message: msg.content, isToxic: msg.isToxic || false })));
    });

    socketRef.current.on("receive_message", (data: Message) => {
      setMessages(prev => [...prev, data]);
    });

    socketRef.current.on("reputation_update", (data: any) => {
      let newScore: number, change = 0, reason = '';
      if (typeof data === 'number') { newScore = data; }
      else if (typeof data === 'object' && data !== null) {
        newScore = data.newScore || data.score || currentReputation;
        change = data.change || 0; reason = data.reason || '';
      } else return;
      setCurrentReputation(newScore);
      localStorage.setItem('userReputation', String(newScore));
      if (change > 0) showToast(`+${change} Rep: ${reason} (${newScore}/100)`, 'positive');
      else if (change < 0) showToast(`${change} Rep: ${reason} (${newScore}/100)`, 'negative');
      else if (reason) showToast(`${reason} (${newScore}/100)`, 'neutral');
    });

    socketRef.current.on("session_closed", () => {
      setClosedBanner("This lobby has been closed.");
      setTimeout(() => onLeave(), 2500);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("load_history");
        socketRef.current.off("receive_message");
        socketRef.current.off("reputation_update");
        socketRef.current.off("session_closed");
        socketRef.current.disconnect();
      }
    };
  }, [lobbyId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const showToast = (message: string, type: 'positive' | 'negative' | 'neutral') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'neutral' }), 3000);
  };

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("send_message", { lobbyId, userId, message: input });
    setInput('');
  };

  const handleLeave = async () => {
    try { await api.post('/lfg/leave', { sessionId: lobbyId }); } catch (err) { console.error("Leave failed:", err); }
    socketRef.current?.disconnect();
    onLeave();
  };

  const handleClose = async () => {
    try { await api.patch(`/lfg/sessions/${lobbyId}/close`); }
    catch (err) { console.error("Close failed:", err); onLeave(); }
  };

  const repColor = currentReputation >= 70 ? '#10b981' : currentReputation >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={s.wrap}>
      {/* Toast */}
      {toast.show && (
        <div style={{
          ...s.toast,
          background: toast.type === 'positive' ? 'linear-gradient(135deg,#10b981,#059669)'
            : toast.type === 'negative' ? 'linear-gradient(135deg,#ef4444,#dc2626)'
            : 'linear-gradient(135deg,#3b82f6,#2563eb)',
        }}>
          {toast.type === 'positive' && '✨ '}{toast.type === 'negative' && '⚠️ '}{toast.type === 'neutral' && '💬 '}
          {toast.message}
        </div>
      )}

      {/* Closed banner */}
      {closedBanner && (
        <div style={s.closedBanner}>{closedBanner}</div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.lobbyDot} />
          <div>
            <div style={s.lobbyName}>Lobby {lobbyId.substring(0, 8)}…</div>
            <div style={s.lobbyStatus}>Live · {isHost ? 'Host' : 'Member'}</div>
          </div>
        </div>

        {/* Reputation chip */}
        <div style={{ ...s.repChip, border: `1px solid ${repColor}44`, color: repColor, background: `${repColor}11` }}>
          {currentReputation}/100 Rep
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isHost ? (
            <button onClick={handleClose} style={s.closeBtn}>Close Lobby</button>
          ) : (
            <button onClick={handleLeave} style={s.leaveBtn}>Leave</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.emptyChat}>No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.username === "You" || msg.username === username;
          const isToxic = msg.isToxic || false;
          return (
            <div key={idx} style={{ ...s.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <div style={s.msgAvatar}>{msg.username.charAt(0).toUpperCase()}</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                {!isMe && <div style={s.msgUsername}>{msg.username}</div>}
                {isToxic && (
                  <div style={s.toxicWarning}>⚠️ Toxic message detected</div>
                )}
                <div style={{
                  ...s.bubble,
                  background: isToxic ? 'rgba(239,68,68,0.15)' : isMe ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.08)',
                  border: isToxic ? '1px solid rgba(239,68,68,0.4)' : isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  color: isToxic ? '#f87171' : '#f1f5f9',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  boxShadow: isToxic ? '0 2px 8px rgba(239,68,68,0.2)' : 'none',
                }}>
                  {msg.message || msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={s.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message… nice messages boost reputation!"
          style={s.input}
        />
        <button onClick={sendMessage} style={s.sendBtn}>Send →</button>
      </div>

      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, overflow: 'hidden', position: 'relative',
  },
  toast: {
    position: 'absolute', top: 80, right: 16, zIndex: 100,
    color: '#fff', padding: '10px 18px', borderRadius: 10,
    fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    animation: 'slideInToast 0.3s ease',
  },
  closedBanner: {
    padding: '10px 20px', background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
    textAlign: 'center', fontWeight: 700, fontSize: 14,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '16px 20px', background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1 },
  lobbyDot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)', flexShrink: 0,
  },
  lobbyName: { fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  lobbyStatus: { fontSize: 11, color: '#475569' },
  repChip: {
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
  },
  closeBtn: {
    padding: '7px 14px', background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
    color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  leaveBtn: {
    padding: '7px 14px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  emptyChat: { textAlign: 'center', color: '#475569', fontSize: 14, paddingTop: 40 },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  msgAvatar: {
    width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#a78bfa', flexShrink: 0,
  },
  msgUsername: { fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 600 },
  toxicWarning: {
    fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
    padding: '4px 8px', marginBottom: 4, fontWeight: 600,
  },
  bubble: {
    padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
  },
  inputRow: {
    display: 'flex', gap: 10, padding: '14px 16px',
    background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1, padding: '11px 16px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#f1f5f9', fontSize: 14,
  },
  sendBtn: {
    padding: '11px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
    whiteSpace: 'nowrap',
  },
};

export default ChatRoom;
