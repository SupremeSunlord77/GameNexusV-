import { useEffect, useState } from "react";
import api from "../services/api";

interface CreateLobbyProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface Game {
  id: string;
  name: string;
}

const CreateLobby = ({ onSuccess, onCancel }: CreateLobbyProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("Asia");
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [micRequired, setMicRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Game dropdown state
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");

  // 🔹 Fetch games on mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await api.get("/lfg/games");
        setGames(res.data);

        // Auto-select first game
        if (res.data.length > 0) {
          setGameId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load games", err);
      }
    };

    fetchGames();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/lfg/sessions", {
        title,
        description,
        region,
        maxPlayers,
        micRequired,
        gameId // ✅ IMPORTANT
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <h1 style={heading}>Create Game Session</h1>
        <p style={subheading}>
          Set up a session and find players that match your preferences.
        </p>

        <form onSubmit={handleSubmit} style={form}>
          {/* Session Title */}
          <FormGroup label="Session Title">
            <input
              style={input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormGroup>

          {/* Game Dropdown */}
          <FormGroup label="Game">
            <select
              style={input}
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              required
            >
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </FormGroup>

          {/* Description */}
          <FormGroup label="Description">
            <textarea
              style={{ ...input, minHeight: 80 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormGroup>

          {/* Region + Max Players */}
          <div style={row}>
            <FormGroup label="Region">
              <select
                style={input}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="Asia">Asia</option>
                <option value="EU">Europe</option>
                <option value="NA">North America</option>
                <option value="SA">South America</option>
              </select>
            </FormGroup>

            <FormGroup label="Max Players">
              <input
                style={input}
                type="number"
                min={2}
                max={10}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              />
            </FormGroup>
          </div>

          {/* Mic Required */}
          <div style={checkboxRow}>
            <input
              type="checkbox"
              checked={micRequired}
              onChange={(e) => setMicRequired(e.target.checked)}
            />
            <span>Microphone required</span>
          </div>

          {/* Actions */}
          <div style={actions}>
            <button type="button" style={secondaryButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" style={primaryButton} disabled={loading}>
              {loading ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------- Helper ---------- */

const FormGroup = ({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={formGroup}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

/* ---------- Styles (unchanged) ---------- */

const pageWrapper: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "#f4f6f8"
};

const card: React.CSSProperties = {
  background: "#ffffff",
  padding: "32px",
  width: "100%",
  maxWidth: "520px",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
};

const heading: React.CSSProperties = {
  margin: 0,
  fontSize: "1.6rem",
  fontWeight: 600,
  color: "#1f2937"
};

const subheading: React.CSSProperties = {
  marginTop: 6,
  marginBottom: 24,
  fontSize: "0.95rem",
  color: "#6b7280"
};

const form: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const formGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 500,
  color: "#374151"
};

const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: "0.95rem"
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 16
};

const checkboxRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10
};

const actions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12
};

const primaryButton: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px"
};

const secondaryButton: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px"
};

export default CreateLobby;
