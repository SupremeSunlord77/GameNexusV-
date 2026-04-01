import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
}

const TOTAL_QUESTIONS = 5;

const BehavioralAssessment = () => {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userTurns, setUserTurns] = useState(0);
  const [done, setDone] = useState(false);
  const [startError, setStartError] = useState(false);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Start the session as soon as the component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return; // handled by auth guard above

    const userId = localStorage.getItem('userId');

    api.post('/agents/onboarding/start', { userId })
      .then(res => {
        setSessionId(res.data.sessionId);
        setMessages([{ role: 'agent', text: res.data.firstQuestion }]);
      })
      .catch(() => setStartError(true));
  }, []);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || loading || done) return;

    const userId = localStorage.getItem('userId');

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/agents/onboarding/message', {
        sessionId,
        userId,
        message: text,
      });

      const newTurns = userTurns + 1;
      setUserTurns(newTurns);
      setMessages(prev => [...prev, { role: 'agent', text: res.data.reply }]);

      if (res.data.isComplete) {
        setDone(true);
        localStorage.setItem('assessmentCompleted', 'true');
        setTimeout(() => navigate('/dashboard'), 2200);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'agent', text: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const progress = Math.min((userTurns / TOTAL_QUESTIONS) * 100, 100);

  // ─── Error state ──────────────────────────────────────────────────────────
  if (startError) {
    return (
      <div style={s.page}>
        <div style={s.orb1} /><div style={s.orb2} />
        <div style={{ ...s.card, textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#f1f5f9', marginBottom: 12 }}>Could not start session</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>
            Make sure you are logged in and the server is running.
          </p>
          <button style={s.sendBtn} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading / initialising ───────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div style={s.page}>
        <div style={s.orb1} /><div style={s.orb2} />
        <div style={{ textAlign: 'center' }}>
          <div style={s.typingDot} />
          <p style={{ color: '#94a3b8', marginTop: 20 }}>Starting your profile session…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.orb1} />
      <div style={s.orb2} />

      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logoWrap}>
            <div style={s.logoIcon}>⚡</div>
            <span style={s.logoText}>GameNexus</span>
          </div>
          <h1 style={s.title}>🧬 Create Your Gamer DNA</h1>
          <p style={s.subtitle}>
            Answer {TOTAL_QUESTIONS} questions to build your behavioral profile
          </p>
        </div>

        {/* Progress bar */}
        <div style={s.progressWrap}>
          <div style={s.progressHeader}>
            <span style={s.progressLabel}>
              {done ? 'Profile complete!' : `${userTurns} / ${TOTAL_QUESTIONS} questions answered`}
            </span>
            <span style={s.progressPct}>{Math.round(progress)}%</span>
          </div>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${progress}%` }} />
          </div>
        </div>

        {/* Chat window */}
        <div style={s.chatWindow}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              {m.role === 'agent' && (
                <div style={s.agentAvatar}>🤖</div>
              )}
              <div
                style={
                  m.role === 'agent'
                    ? s.agentBubble
                    : s.userBubble
                }
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator while waiting */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={s.agentAvatar}>🤖</div>
              <div style={s.agentBubble}>
                <span className="typing-dot">
                  <span /><span /><span />
                </span>
              </div>
            </div>
          )}

          {/* Completion message */}
          {done && (
            <div style={s.completionBanner}>
              ✅ Gamer DNA profile created! Redirecting to dashboard…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div style={s.inputRow}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={done ? 'Profile complete!' : 'Type your answer… (Enter to send)'}
            disabled={loading || done || !sessionId}
            rows={2}
            style={s.textarea}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || done}
            style={{
              ...s.sendBtn,
              opacity: !input.trim() || loading || done ? 0.4 : 1,
            }}
          >
            {loading ? '…' : '→'}
          </button>
        </div>

        <p style={s.hint}>💡 Be honest — better matches come from authentic answers. Shift+Enter for a new line.</p>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 30% 70%, #1a0533 0%, #06060f 60%)',
    padding: 20, position: 'relative', overflow: 'hidden',
  },
  orb1: {
    position: 'fixed', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
    top: '-20%', right: '-10%', pointerEvents: 'none',
  },
  orb2: {
    position: 'fixed', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
    bottom: '-10%', left: '-5%', pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 680, position: 'relative', zIndex: 1,
  },
  header: { textAlign: 'center', marginBottom: 24 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 },
  logoIcon: {
    width: 36, height: 36, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
    boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
  },
  logoText: { fontSize: 18, fontWeight: 800, color: '#f1f5f9' },
  title: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', margin: 0 },
  progressWrap: { marginBottom: 16 },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  progressPct: { fontSize: 13, color: '#a78bfa', fontWeight: 700 },
  progressTrack: {
    height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #667eea 0%, #a78bfa 100%)',
    borderRadius: 3, transition: 'width 0.5s ease',
  },
  chatWindow: {
    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
    padding: '20px 20px 12px', marginBottom: 12,
    maxHeight: 420, overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  agentAvatar: {
    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
    background: 'rgba(124,58,237,0.25)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 16,
    marginRight: 8, alignSelf: 'flex-end',
  },
  agentBubble: {
    background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 16px', maxWidth: '78%',
    color: '#e2e8f0', fontSize: 15, lineHeight: 1.55,
  },
  userBubble: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '18px 18px 4px 18px',
    padding: '10px 16px', maxWidth: '78%',
    color: '#fff', fontSize: 15, lineHeight: 1.55,
    boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
  },
  typingDots: {
    display: 'inline-flex', gap: 4, alignItems: 'center',
  },
  typingDot: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid #667eea', borderTopColor: 'transparent',
    display: 'inline-block', margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
  completionBanner: {
    textAlign: 'center', marginTop: 8, marginBottom: 4,
    padding: '12px 20px', borderRadius: 12,
    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
    color: '#10b981', fontSize: 14, fontWeight: 600,
  },
  inputRow: {
    display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10,
  },
  textarea: {
    flex: 1, resize: 'none',
    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
    color: '#f1f5f9', fontSize: 15, padding: '12px 16px',
    outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
  },
  sendBtn: {
    padding: '0 22px', height: 52, border: 'none', borderRadius: 14,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(124,58,237,0.4)', flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  card: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
    padding: '28px 32px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  hint: { textAlign: 'center', fontSize: 12, color: '#475569', margin: 0 },
};

export default BehavioralAssessment;
