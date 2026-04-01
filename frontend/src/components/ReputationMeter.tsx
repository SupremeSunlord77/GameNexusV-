import React from 'react';

interface Props { score: number; }

const ReputationMeter = ({ score }: Props) => {
  const color = score >= 70 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444';
  const glow = score >= 70 ? 'rgba(16,185,129,0.4)' : score >= 30 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';
  const status = score >= 70 ? 'Excellent' : score >= 30 ? 'Neutral' : 'Critical';
  const emoji = score >= 70 ? '🟢' : score >= 30 ? '🟡' : '🔴';

  return (
    <div style={s.wrap}>
      <div style={s.row}>
        <span style={s.label}>Behavior Score</span>
        <span style={{ ...s.score, color }}>{score}<span style={s.max}>/100</span></span>
      </div>
      <div style={s.track}>
        <div style={{ ...s.fill, width: `${score}%`, background: color, boxShadow: `0 0 10px ${glow}` }} />
      </div>
      <div style={s.status}>
        <span>{emoji}</span>
        <span style={{ color, fontWeight: 600 }}>{status}</span>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  wrap: {
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '14px 16px', marginTop: 16,
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  score: { fontSize: 18, fontWeight: 800 },
  max: { fontSize: 12, fontWeight: 500, color: '#475569' },
  track: { height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  fill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  status: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
};

export default ReputationMeter;
