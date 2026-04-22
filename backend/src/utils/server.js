require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { clerkMiddleware } = require('@clerk/express');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const shopRoutes = require('./routes/shopRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const progressRoutes = require('./routes/progressRoutes');
const geminiRoutes = require('./routes/geminiRoutes');
const setupMultiplayer = require('./socket/multiplayerHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Clerk middleware must be registered BEFORE express.json() so it can
// parse raw bodies on the webhook route while still processing JSON elsewhere.
app.use(clerkMiddleware());

// CORS
app.use(cors());

// Raw body parser for Clerk webhook (must come before express.json())
app.use('/api/auth/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/evaluate', geminiRoutes);

// Health check
app.get('/api', (req, res) => {
    res.send('Codo Leveling API is running (Supabase + Clerk)');
});

// Setup Socket.io
setupMultiplayer(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
