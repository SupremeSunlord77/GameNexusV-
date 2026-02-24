import React from 'react';

interface Props {
  score: number;
}

const ReputationMeter = ({ score }: Props) => {
  // 1. Determine Color & Status based on Score
  let color = '#22c55e'; // Green
  let status = 'Excellent';
  
  if (score < 70) {
    color = '#f59e0b'; // Yellow
    status = 'Neutral';
  }
  if (score < 30) {
    color = '#ef4444'; // Red
    status = 'Critical (Toxic Queue)';
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.label}>Behavior Score</span>
        <span style={{ color: color, fontWeight: 'bold' }}>{score}/100</span>
      </div>

      {/* The Background Bar */}
      <div style={styles.track}>
        {/* The Animated Fill Bar */}
        <div style={{ 
          ...styles.fill, 
          width: `${score}%`, 
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}` // Glowing effect
        }} />
      </div>

      <p style={styles.statusText}>
        Status: <span style={{ color: color }}>{status}</span>
      </p>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '15px',
    borderRadius: '12px',
    marginTop: '20px',
    border: '1px solid #444'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#e4e4e7'
  },
  label: {
    fontWeight: 600
  },
  track: {
    width: '100%',
    height: '8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease-in-out' // Smooth animation when score updates
  },
  statusText: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#a1a1aa',
    textAlign: 'center'
  }
};

export default ReputationMeter;