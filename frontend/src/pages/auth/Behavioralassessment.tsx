import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BehavioralAssessment = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(10).fill(3));
  const [loading, setLoading] = useState(false);

  const questions = [
    {
      id: 1,
      text: "I prefer voice chat during games",
      category: "Communication",
      scale: { low: "Never", high: "Always" }
    },
    {
      id: 2,
      text: "I like to chat frequently with teammates",
      category: "Communication",
      scale: { low: "Silent Player", high: "Very Chatty" }
    },
    {
      id: 3,
      text: "Winning is more important than having fun",
      category: "Competitive",
      scale: { low: "Strongly Disagree", high: "Strongly Agree" }
    },
    {
      id: 4,
      text: "I get frustrated when teammates make mistakes",
      category: "Competitive",
      scale: { low: "Never", high: "Very Often" }
    },
    {
      id: 5,
      text: "I can handle trash talk without getting upset",
      category: "Toxicity Tolerance",
      scale: { low: "Can't Handle It", high: "Doesn't Bother Me" }
    },
    {
      id: 6,
      text: "Toxic behavior from others doesn't affect me",
      category: "Toxicity Tolerance",
      scale: { low: "Bothers Me a Lot", high: "Doesn't Bother Me" }
    },
    {
      id: 7,
      text: "I enjoy helping new players learn the game",
      category: "Mentorship",
      scale: { low: "Not Interested", high: "Love Teaching" }
    },
    {
      id: 8,
      text: "I'm willing to teach strategies to teammates",
      category: "Mentorship",
      scale: { low: "No", high: "Absolutely" }
    },
    {
      id: 9,
      text: "I show up on time for scheduled gaming sessions",
      category: "Reliability",
      scale: { low: "Rarely", high: "Always" }
    },
    {
      id: 10,
      text: "I commit to finishing games I start",
      category: "Reliability",
      scale: { low: "Sometimes Quit", high: "Always Finish" }
    }
  ];

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/behavioral/assessment', { answers });
      
      // Mark assessment as completed
      localStorage.setItem('assessmentCompleted', 'true');
      
      alert('🎮 Gamer DNA Profile Created! Welcome to GameNexus!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      alert('Failed to submit assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🧬 Create Your Gamer DNA</h1>
          <p style={styles.subtitle}>
            Help us understand your gaming style to match you with compatible players
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.progressText}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>

        {/* Question Card */}
        <div style={styles.questionCard}>
          <div style={styles.categoryBadge}>{question.category}</div>
          <h2 style={styles.questionText}>{question.text}</h2>

          {/* Scale */}
          <div style={styles.scaleContainer}>
            <div style={styles.scaleLabels}>
              <span style={styles.scaleLabel}>{question.scale.low}</span>
              <span style={styles.scaleLabel}>{question.scale.high}</span>
            </div>

            {/* Rating Buttons */}
            <div style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleAnswer(value)}
                  style={{
                    ...styles.ratingButton,
                    ...(answers[currentQuestion] === value ? styles.ratingButtonActive : {})
                  }}
                >
                  {value}
                </button>
              ))}
            </div>

            {/* Visual Slider */}
            <input
              type="range"
              min="1"
              max="5"
              value={answers[currentQuestion]}
              onChange={(e) => handleAnswer(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          {/* Current Selection */}
          <div style={styles.selectionDisplay}>
            <span style={styles.selectionLabel}>Your Selection:</span>
            <span style={styles.selectionValue}>{answers[currentQuestion]}/5</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={styles.navigationButtons}>
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            style={{
              ...styles.navButton,
              ...styles.prevButton,
              ...(currentQuestion === 0 ? styles.navButtonDisabled : {})
            }}
          >
            ← Previous
          </button>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.navButton,
                ...styles.submitButton,
                ...(loading ? styles.navButtonDisabled : {})
              }}
            >
              {loading ? 'Creating Profile...' : 'Complete Assessment ✓'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{
                ...styles.navButton,
                ...styles.nextButton
              }}
            >
              Next →
            </button>
          )}
        </div>

        {/* Help Text */}
        <p style={styles.helpText}>
          💡 Be honest! Better matches come from authentic answers.
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '700px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  progressContainer: {
    marginBottom: '30px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '600',
  },
  questionCard: {
    background: '#f9fafb',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
  },
  categoryBadge: {
    display: 'inline-block',
    background: '#dbeafe',
    color: '#1e40af',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  questionText: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '30px',
    lineHeight: '1.4',
  },
  scaleContainer: {
    marginBottom: '20px',
  },
  scaleLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  scaleLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  ratingButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '20px',
  },
  ratingButton: {
    flex: 1,
    padding: '16px',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  ratingButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid #667eea',
    transform: 'scale(1.05)',
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    outline: 'none',
    cursor: 'pointer',
  },
  selectionDisplay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
  },
  selectionLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  selectionValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  navigationButtons: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  navButton: {
    flex: 1,
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  prevButton: {
    background: '#f3f4f6',
    color: '#374151',
  },
  nextButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
  },
  navButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  helpText: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
};

export default BehavioralAssessment;