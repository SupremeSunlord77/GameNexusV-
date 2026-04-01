import { useState, useEffect } from 'react';
import api from '../../services/api';

interface MatchedPlayer {
  id: string; username: string; reputation: number;
  bartleType: string; playStyleTags: string[]; compatibilityScore: number;
  interpretation: string;
  profile?: { displayName?: string; avatarUrl?: string; region?: string };
}

interface CompatibilityResult {
  score: number; needsAssessment?: boolean; message?: string;
  interpretation: string; recommendation: string;
  breakdown: { behavioral: number; trust: number; distance: number };
  details: { user1: { username: string; type: string }; user2: { username: string; type: string } };
}

function scoreColor(s: number) {
  if (s > 0.8) return '#10b981';
  if (s > 0.65) return '#3b82f6';
  if (s > 0.5) return '#f59e0b';
  return '#ef4444';
}
function scoreGrad(s: number) {
  if (s > 0.8) return 'linear-gradient(135deg, #10b981, #059669)';
  if (s > 0.65) return 'linear-gradient(135deg, #3b82f6, #2563eb)';
  if (s > 0.5) return 'linear-gradient(135deg, #f59e0b, #d97706)';
  return 'linear-gradient(135deg, #ef4444, #dc2626)';
}

function Avatar({ username, size = 44 }: { username: string; size?: number }) {
  const hue = username.charCodeAt(0) * 17 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 35%)`, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
      border: `2px solid hsl(${hue}, 55%, 50%)`,
    }}>{username.slice(0, 2).toUpperCase()}</div>
  );
}

export default function Compatibility() {
  const [matches, setMatches] = useState<MatchedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAssessment, setNeedsAssessment] = useState(false);
  const [selected, setSelected] = useState<MatchedPlayer | null>(null);
  const [pairResult, setPairResult] = useState<CompatibilityResult | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/behavioral/matches')
      .then(res => {
        if (res.data.needsAssessment) setNeedsAssessment(true);
        else setMatches(res.data.matches ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (p: MatchedPlayer) => {
    setSelected(p); setPairResult(null); setPairLoading(true);
    try {
      const res = await api.get(`/behavioral/compatibility/${p.id}`);
      setPairResult(res.data);
    } catch { /* ignore */ }
    finally { setPairLoading(false); }
  };

  if (needsAssessment) return (
    <div style={s.assessPage}>
      <div style={s.assessCard}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🧬</div>
        <h2 style={s.assessTitle}>Complete Your Behavioral Assessment</h2>
        <p style={s.assessSub}>Your Gamer DNA profile is needed to find compatible teammates.</p>
        <a href="/assessment" style={s.assessBtn}>Take Assessment →</a>
      </div>
    </div>
  );

  return (
    <div style={s.layout}>
      {/* Left panel */}
      <div style={s.leftPanel}>
        <div style={s.leftHeader}>
          <h2 style={s.leftTitle}>Compatibility Matches</h2>
          <p style={s.leftSub}>{loading ? 'Scanning…' : `${matches.length} players found`}</p>
        </div>

        <div style={s.matchList}>
          {loading && (
            <div style={s.listMsg}>
              <div style={s.spinner} />
              <span>Finding your matches…</span>
            </div>
          )}
          {!loading && matches.length === 0 && (
            <div style={s.listMsg}>No players with profiles found yet.</div>
          )}
          {matches.map(p => (
            <div
              key={p.id} onClick={() => handleSelect(p)}
              style={{
                ...s.matchRow,
                background: selected?.id === p.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                borderLeft: `3px solid ${selected?.id === p.id ? '#a78bfa' : 'transparent'}`,
              }}
            >
              <Avatar username={p.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.rowName}>{p.username}</div>
                <div style={s.rowMeta}>
                  {p.bartleType && <span style={s.rowTag}>🎮 {p.bartleType}</span>}
                  {p.profile?.region && <span style={s.rowTag}>🌍 {p.profile.region}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(p.compatibilityScore) }}>
                  {(p.compatibilityScore * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: '#475569' }}>match</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={s.rightPanel}>
        {!selected && (
          <div style={s.emptyDetail}>
            <div style={{ fontSize: 56 }}>🤝</div>
            <h3 style={{ color: '#f1f5f9', marginTop: 16, marginBottom: 8 }}>Select a player</h3>
            <p style={{ color: '#475569', margin: 0 }}>Click a match to see detailed compatibility breakdown</p>
          </div>
        )}

        {selected && (
          <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: 660 }}>
            {/* Player card */}
            <div style={s.detailCard}>
              <div style={s.playerRow}>
                <Avatar username={selected.username} size={64} />
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
                    {selected.profile?.displayName || selected.username}
                  </h2>
                  {selected.profile?.displayName && <div style={{ color: '#475569', fontSize: 13 }}>@{selected.username}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {selected.bartleType && <Tag color="#a78bfa">{selected.bartleType}</Tag>}
                    {selected.playStyleTags.map(t => <Tag key={t} color="#64748b">{t}</Tag>)}
                    {selected.profile?.region && <Tag color="#22d3ee">{selected.profile.region}</Tag>}
                  </div>
                </div>
                <button
                  onClick={() => !sentRequests.has(selected.id) && setSentRequests(p => new Set(p).add(selected.id))}
                  style={{
                    ...s.reqBtn,
                    ...(sentRequests.has(selected.id) ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' } : {}),
                  }}
                >
                  {sentRequests.has(selected.id) ? '✓ Sent' : '+ Invite'}
                </button>
              </div>
              {/* Reputation bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>REPUTATION</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width 0.4s',
                    width: `${selected.reputation}%`,
                    background: selected.reputation >= 70 ? '#10b981' : selected.reputation >= 40 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', minWidth: 42 }}>{selected.reputation}/100</span>
              </div>
            </div>

            {/* Compatibility score */}
            {pairLoading && (
              <div style={{ ...s.detailCard, textAlign: 'center', padding: 40 }}>
                <div style={s.spinner} />
                <p style={{ color: '#64748b', marginTop: 12 }}>Calculating compatibility…</p>
              </div>
            )}

            {pairResult && !pairResult.needsAssessment && (
              <>
                {/* Big score */}
                <div style={{ ...s.detailCard, background: scoreGrad(pairResult.score), textAlign: 'center', padding: '36px 28px' }}>
                  <div style={{ fontSize: 76, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                    {(pairResult.score * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>{pairResult.interpretation}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{pairResult.recommendation}</div>
                </div>

                {/* Breakdown */}
                <div style={s.detailCard}>
                  <h3 style={s.cardTitle}>Score Breakdown</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <ScoreCard label="Behavioral" value={`${(pairResult.breakdown.behavioral * 100).toFixed(1)}%`} sub="60% weight" />
                    <ScoreCard label="Trust" value={`${(pairResult.breakdown.trust * 100).toFixed(1)}%`} sub="25% weight" />
                    <ScoreCard label="Vector Dist" value={pairResult.breakdown.distance.toFixed(3)} sub="5D space" />
                  </div>
                </div>

                {/* Gamer types */}
                <div style={s.detailCard}>
                  <h3 style={s.cardTitle}>Gamer Types</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <TypeCard label="You" username={pairResult.details.user1.username} type={pairResult.details.user1.type} />
                    <TypeCard label="Them" username={pairResult.details.user2.username} type={pairResult.details.user2.type} />
                  </div>
                </div>
              </>
            )}

            {pairResult?.needsAssessment && (
              <div style={{ ...s.detailCard, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <p style={{ color: '#fbbf24', fontWeight: 600, margin: 0 }}>{pairResult.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const Tag = ({ children, color }: any) => (
  <span style={{
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
    background: `${color}22`, color, border: `1px solid ${color}44`,
  }}>{children}</span>
);

const ScoreCard = ({ label, value, sub }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '16px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa' }}>{value}</div>
    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{sub}</div>
  </div>
);

const TypeCard = ({ label, username, type }: any) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '16px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{username}</div>
    {type && (
      <span style={{
        display: 'inline-block', padding: '5px 14px', borderRadius: 20,
        background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff',
        fontSize: 12, fontWeight: 700,
      }}>{type}</span>
    )}
  </div>
);

const s: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', height: '100vh', background: '#0d0d1a', overflow: 'hidden', fontFamily: 'Inter, sans-serif' },

  leftPanel: {
    width: 320, background: 'rgba(255,255,255,0.02)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  leftHeader: { padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  leftTitle: { fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 },
  leftSub: { fontSize: 13, color: '#475569', margin: 0 },
  matchList: { flex: 1, overflowY: 'auto' },
  listMsg: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px', color: '#475569', fontSize: 14 },
  matchRow: {
    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
    cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.15s', borderLeft: '3px solid transparent',
  },
  rowName: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  rowMeta: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  rowTag: { fontSize: 11, color: '#64748b' },

  rightPanel: { flex: 1, overflowY: 'auto', padding: 28 },
  emptyDetail: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', textAlign: 'center',
  },

  detailCard: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
    padding: '24px', marginBottom: 16,
  },
  playerRow: { display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  reqBtn: {
    padding: '9px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', alignSelf: 'flex-start', flexShrink: 0,
  },

  spinner: {
    width: 28, height: 28, border: '3px solid rgba(255,255,255,0.08)',
    borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },

  assessPage: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#0d0d1a',
  },
  assessCard: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '48px 40px', textAlign: 'center', maxWidth: 440,
  },
  assessTitle: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 },
  assessSub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  assessBtn: {
    display: 'inline-block', padding: '13px 32px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 15,
    boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
  },
};
