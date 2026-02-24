import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; 
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketIO } from './sockets/socketHandler';
import { setIO } from './sockets/ioInstance';

// Import Routes
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import lfgRoutes from './routes/lfgRoutes';
import adminRoutes from './routes/adminRoutes';      // 👈 NEW IMPORT
import moderatorRoutes from './routes/moderatorRoutes'; // 👈 NEW IMPORT
import behavioralRoutes from './routes/behavioralRoutes';
import endorsementRoutes from './routes/endorsementRoutes';

console.log("1. Starting server script...");

dotenv.config();

const app = express();

app.use(cors()); 
app.use(express.json());

// --- SOCKET.IO SETUP ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

<<<<<<< HEAD
// Setup Socket Logic
// (Make sure socketHandler.ts exists, otherwise comment this out for now)
try {
    setupSocketIO(io); 
} catch (e) {
    console.log("Socket setup skipped (file might be missing)");
}
=======
setIO(io);
setupSocketIO(io);
>>>>>>> aad6b7800a3d9d79befb563f031b7f8af0dec04d

// --- 🔌 REGISTER ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/lfg', lfgRoutes);
app.use('/api/admin', adminRoutes);          // 👈 WIRES UP /api/admin/stats
app.use('/api/moderator', moderatorRoutes);  // 👈 WIRES UP /api/moderator/ban
app.use('/api/behavioral', behavioralRoutes);
app.use('/api/endorsements', endorsementRoutes);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✅ SUCCESS: Server (HTTP + Socket) running on port ${PORT}`);
  console.log(`   - Admin Routes:   Enabled`);
  console.log(`   - Mod Routes:     Enabled`);
});