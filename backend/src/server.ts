import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './sockets/socketHandler';
import { setIO } from './sockets/ioInstance';

// Import Routes
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import lfgRoutes from './routes/lfgRoutes';
import adminRoutes from './routes/adminRoutes';
import moderatorRoutes from './routes/moderatorRoutes';
import behavioralRoutes from './routes/behavioralRoutes';
import endorsementRoutes from './routes/endorsementRoutes';
import notificationRoutes from './routes/notificationRoutes';
import ticketRoutes from './routes/ticketRoutes';

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

setIO(io);
try {
  setupSocketHandlers(io);
} catch (e) {
  console.log("Socket setup skipped (file might be missing)");
}

// --- 🔌 REGISTER ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/lfg', lfgRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/behavioral', behavioralRoutes);
app.use('/api/endorsements', endorsementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tickets', ticketRoutes);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✅ SUCCESS: Server (HTTP + Socket) running on port ${PORT}`);
  console.log(`   - Admin Routes:        Enabled`);
  console.log(`   - Mod Routes:          Enabled`);
  console.log(`   - Notification Routes: Enabled`);
  console.log(`   - Ticket Routes:       Enabled`);
});
