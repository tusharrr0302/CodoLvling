import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleMultiplayer } from './src/socket/multiplayerHandler.js';
import { handlePvP } from './src/socket/pvpHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // We will restrict this later
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Codo Leveling API is running...');
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  handleMultiplayer(io, socket);
  handlePvP(io, socket);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
