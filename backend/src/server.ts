import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // <--- NEW 1: Import it
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketIO } from './sockets/socketHandler';

import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import lfgRoutes from './routes/lfgRoutes';

console.log("1. Starting server script...");

dotenv.config();

const app = express();

app.use(cors()); // <--- NEW 2: Enable it for everyone
app.use(express.json());

// --- SOCKET.IO SETUP ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

setupSocketIO(io); 

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/lfg', lfgRoutes);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✅ SUCCESS: Server (HTTP + Socket) running on port ${PORT}`);
});