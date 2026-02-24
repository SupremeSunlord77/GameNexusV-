import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  radarData: {
    labels: string[];
    values: number[];
  };
  bartleType?: string;
}

export default function BehavioralRadar({ radarData, bartleType }: Props) {
  // Transform data for recharts
  const chartData = radarData.labels.map((label, index) => ({
    dimension: label,
    value: radarData.values[index]
  }));

  return (
    <div style={{
      background: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginTop: '20px'
    }}>
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        marginBottom: '10px',
        textAlign: 'center',
        color: '#1f2937'
      }}>
        🧬 Your Gamer DNA
      </h3>

      {bartleType && (
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '12px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          color: 'white',
          fontWeight: '700',
          fontSize: '1.2rem'
        }}>
          Type: {bartleType}
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="dimension" 
            tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: '#6b7280' }}
          />
          <Radar 
            name="Your Profile" 
            dataKey="value" 
            stroke="#667eea" 
            fill="#667eea" 
            fillOpacity={0.6}
            strokeWidth={3}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>

      {/* Numerical Values */}
      <div style={{
        marginTop: '25px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px'
      }}>
        {chartData.map((item, idx) => (
          <div key={idx} style={{
            padding: '14px',
            background: '#f9fafb',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>
              {item.dimension}
            </span>
            <span style={{ 
              fontWeight: '700', 
              fontSize: '1.3rem',
              color: '#667eea'
            }}>
              {item.value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}