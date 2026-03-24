import { useState, useEffect } from 'react';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedPlayer {
  id: string;
  username: string;
  reputation: number;
  bartleType: string;
  playStyleTags: string[];
  compatibilityScore: number;
  interpretation: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    region?: string;
  };
}

interface CompatibilityResult {
  score: number;
  needsAssessment?: boolean;
  message?: string;
  interpretation: string;
  recommendation: string;
  breakdown: { behavioral: number; trust: number; distance: number };
  details: {
    user1: { username: string; type: string };
    user2: { username: string; type: string };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreGradient(score: number) {
  if (score > 0.8) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  if (score > 0.65) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
  if (score > 0.5) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
}

function scoreColor(score: number) {
  if (score > 0.8) return '#10b981';
  if (score > 0.65) return '#3b82f6';
  if (score > 0.5) return '#f59e0b';
  return '#ef4444';
}

function AvatarPlaceholder({ username, size = 48 }: { username: string; size?: number }) {
  const initials = username.slice(0, 2).toUpperCase();
  const hue = username.charCodeAt(0) * 17 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 700, fontSize: size * 0.35, color: '#fff', flexShrink: 0,
      background: `hsl(${hue}, 60%, 40%)`
    }}>{initials}</div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Compatibility() {
  const [matches, setMatches] = useState<MatchedPlayer[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [needsAssessment, setNeedsAssessment] = useState(false);

  // One-to-one compare panel
  const [selectedPlayer, setSelectedPlayer] = useState<MatchedPlayer | null>(null);
  const [pairResult, setPairResult] = useState<CompatibilityResult | null>(null);
  const [pairLoading, setPairLoading] = useState(false);

  // Request sent tracking
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/behavioral/matches')
      .then(res => {
        if (res.data.needsAssessment) {
          setNeedsAssessment(true);
        } else {
          setMatches(res.data.matches ?? []);
        }
      })
      .catch(console.error)
      .finally(() => setMatchesLoading(false));
  }, []);

  const handleSelectPlayer = async (player: MatchedPlayer) => {
    setSelectedPlayer(player);
    setPairResult(null);
    setPairLoading(true);
    try {
      const res = await api.get(`/behavioral/compatibility/${player.id}`);
      setPairResult(res.data);
    } catch { /* ignore */ }
    finally { setPairLoading(false); }
  };

  const handleSendRequest = (playerId: string) => {
    setSentRequests(prev => new Set(prev).add(playerId));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (needsAssessment) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🧬</div>
        <h2>Complete Your Behavioral Assessment</h2>
        <p style={{ color: '#64748b' }}>Your Gamer DNA profile is needed to find compatible teammates.</p>
        <a href="/assessment" style={{
          display: 'inline-block', marginTop: 20, padding: '12px 32px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700
        }}>Take Assessment</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* ── Left: matches list ── */}
      <div style={{ width: 360, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937' }}>🤝 Compatibility Matches</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
            {matches.length} compatible players found
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {matchesLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Finding your matches…</div>
          )}
          {!matchesLoading && matches.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              No players with profiles found yet.
            </div>
          )}
          {matches.map(player => (
            <div
              key={player.id}
              onClick={() => handleSelectPlayer(player)}
              style={{
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                background: selectedPlayer?.id === player.id ? '#eff6ff' : '#fff',
                borderLeft: selectedPlayer?.id === player.id ? '4px solid #667eea' : '4px solid transparent',
                transition: 'background 0.15s'
              }}
            >
              <AvatarPlaceholder username={player.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 15 }}>{player.username}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {player.bartleType && <span style={{ marginRight: 6 }}>🎮 {player.bartleType}</span>}
                  {player.profile?.region && <span>🌍 {player.profile.region}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: scoreColor(player.compatibilityScore) }}>
                  {(player.compatibilityScore * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>match</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

        {!selectedPlayer && (
          <div style={{ textAlign: 'center', paddingTop: 100, color: '#9ca3af' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>👈</div>
            <p style={{ fontSize: 16 }}>Select a player to see detailed compatibility</p>
          </div>
        )}

        {selectedPlayer && (
          <div style={{ maxWidth: 700 }}>

            {/* Profile Card */}
            <div style={{
              background: '#fff', borderRadius: 16, padding: 28,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginBottom: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <AvatarPlaceholder username={selectedPlayer.username} size={72} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, color: '#1f2937' }}>
                    {selectedPlayer.profile?.displayName || selectedPlayer.username}
                  </h2>
                  {selectedPlayer.profile?.displayName && (
                    <div style={{ color: '#9ca3af', fontSize: 14 }}>@{selectedPlayer.username}</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {selectedPlayer.bartleType && (
                      <Tag color="#667eea">{selectedPlayer.bartleType}</Tag>
                    )}
                    {selectedPlayer.playStyleTags.map(tag => (
                      <Tag key={tag} color="#6b7280">{tag}</Tag>
                    ))}
                    {selectedPlayer.profile?.region && (
                      <Tag color="#10b981">{selectedPlayer.profile.region}</Tag>
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <button
                    onClick={() => !sentRequests.has(selectedPlayer.id) && handleSendRequest(selectedPlayer.id)}
                    style={{
                      padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15,
                      cursor: sentRequests.has(selectedPlayer.id) ? 'default' : 'pointer',
                      background: sentRequests.has(selectedPlayer.id)
                        ? '#d1fae5' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: sentRequests.has(selectedPlayer.id) ? '#059669' : '#fff',
                      border: 'none'
                    }}
                  >
                    {sentRequests.has(selectedPlayer.id) ? '✅ Request Sent' : '👋 Send Request'}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Reputation</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 999, height: 8 }}>
                  <div style={{
                    height: 8, borderRadius: 999,
                    width: `${selectedPlayer.reputation}%`,
                    background: selectedPlayer.reputation >= 70 ? '#10b981' : selectedPlayer.reputation >= 40 ? '#f59e0b' : '#ef4444'
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{selectedPlayer.reputation}/100</span>
              </div>
            </div>

            {/* Compatibility Score */}
            {pairLoading && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', color: '#9ca3af', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                Calculating compatibility…
              </div>
            )}

            {pairResult && !pairResult.needsAssessment && (
              <>
                {/* Big score card */}
                <div style={{
                  background: scoreGradient(pairResult.score), borderRadius: 16, padding: '36px 28px',
                  textAlign: 'center', color: '#fff', marginBottom: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: 72, fontWeight: 800 }}>{(pairResult.score * 100).toFixed(0)}%</div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>{pairResult.interpretation}</div>
                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>{pairResult.recommendation}</div>
                </div>

                {/* Breakdown */}
                <div style={{
                  background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                }}>
                  <h3 style={{ margin: '0 0 16px', color: '#374151' }}>📊 Score Breakdown</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <ScoreCard label="Behavioral" value={`${(pairResult.breakdown.behavioral * 100).toFixed(1)}%`} sub="70% weight" />
                    <ScoreCard label="Trust Score" value={`${(pairResult.breakdown.trust * 100).toFixed(1)}%`} sub="30% weight" />
                    <ScoreCard label="Vector Distance" value={pairResult.breakdown.distance.toFixed(3)} sub="5D space" />
                  </div>
                </div>

                {/* Gamer types */}
                <div style={{
                  background: '#fff', borderRadius: 16, padding: 24,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                }}>
                  <h3 style={{ margin: '0 0 16px', color: '#374151' }}>🎮 Gamer Types</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <TypeCard label="You" username={pairResult.details.user1.username} type={pairResult.details.user1.type} />
                    <TypeCard label="Them" username={pairResult.details.user2.username} type={pairResult.details.user2.type} />
                  </div>
                </div>
              </>
            )}

            {pairResult?.needsAssessment && (
              <div style={{
                background: '#fffbeb', border: '2px solid #fbbf24', borderRadius: 16, padding: 32, textAlign: 'center'
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <p style={{ fontWeight: 600, color: '#92400e', margin: 0, fontSize: 16 }}>{pairResult.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: `${color}22`, color
    }}>{children}</span>
  );
}

function ScoreCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 12, padding: '20px 16px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#667eea' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function TypeCard({ label, username, type }: { label: string; username: string; type: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 12, padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 10 }}>{username}</div>
      {type && (
        <span style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff'
        }}>{type}</span>
      )}
    </div>
  );
}
