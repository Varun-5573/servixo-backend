const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/location', require('./routes/locationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/workers', require('./routes/workerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ratings', require('./routes/ratingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Servixo Backend Running 🚀', version: '1.0.0' });
});

// Socket.IO Real-time system
const connectedUsers = {};
const connectedWorkers = {};

io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);

  // User join
  socket.on('user_join', (userId) => {
    connectedUsers[userId] = socket.id;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} connected`);
  });

  // Worker join
  socket.on('worker_join', (workerId) => {
    connectedWorkers[workerId] = socket.id;
    socket.join(`worker_${workerId}`);
    console.log(`Worker ${workerId} connected`);
  });

  // Admin join
  socket.on('admin_join', () => {
    socket.join('admin_room');
    console.log('Admin connected');
  });

  // Worker live location update
  socket.on('worker_location_update', async (data) => {
    const { workerId, lat, lng, bookingId } = data;
    // Broadcast to user tracking this worker
    if (bookingId) {
      io.to(`booking_${bookingId}`).emit('live_location', { workerId, lat, lng });
    }
    // Broadcast to admin
    io.to('admin_room').emit('worker_location', { workerId, lat, lng });

    // Update in DB
    try {
      const Worker = require('./models/Worker');
      await Worker.findByIdAndUpdate(workerId, {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        'currentLocation.updatedAt': new Date()
      });
    } catch (e) {}
  });

  // User tracking a booking
  socket.on('track_booking', (bookingId) => {
    socket.join(`booking_${bookingId}`);
  });

  // Chat messages
  socket.on('send_message', async (data) => {
    const { senderId, receiverId, message, senderType } = data;
    try {
      const Message = require('./models/Message');
      const newMsg = await Message.create({ senderId, receiverId, message, senderType });
      
      // Emit to receiver
      io.to(`user_${receiverId}`).emit('receive_message', newMsg);
      io.to(`worker_${receiverId}`).emit('receive_message', newMsg);
      io.to('admin_room').emit('receive_message', newMsg);

      // --- AUTOMATIC CHATBOT INTEGRATION ---
      // If a user sends a message to the admin, the bot replies instantly
      if (receiverId === 'admin' && senderType === 'user') {
        setTimeout(async () => {
          let botMsg = "Hello! I am the Servixo AI Support Bot 🤖. How can I assist you with your home services today?";
          
          const msgLower = message.toLowerCase();
          if (msgLower.includes("problem") || msgLower.includes("issue")) {
            botMsg = "I'm sorry to hear you're facing a problem. Our human admins in the control panel have been notified and will jump into this chat momentarily! In the meantime, could you provide more details?";
          } else if (msgLower.includes("price") || msgLower.includes("cost")) {
            botMsg = "Our pricing is transparent! You can view the exact cost of each service right on the Home Screen before booking.";
          } else if (msgLower.includes("delay") || msgLower.includes("where") || msgLower.includes("time")) {
            botMsg = "You can track your assigned worker live on the map from your 'Bookings' section! Let me know if you still cannot see them.";
          }
          
          const autoReply = await Message.create({
            senderId: 'bot',
            receiverId: senderId,
            message: botMsg,
            senderType: 'bot'
          });
          
          io.to(`user_${senderId}`).emit('receive_message', autoReply);
          io.to('admin_room').emit('receive_message', autoReply);
        }, 1200); // 1.2 second delay to feel natural
      }
      
    } catch (e) {
      console.error("Chat error:", e);
    }
  });

  // Booking status update
  socket.on('booking_status_update', (data) => {
    const { bookingId, status, userId } = data;
    io.to(`user_${userId}`).emit('booking_update', { bookingId, status });
    io.to('admin_room').emit('booking_update', { bookingId, status });
  });

  socket.on('disconnect', () => {
    // Clean up
    Object.keys(connectedUsers).forEach(k => {
      if (connectedUsers[k] === socket.id) delete connectedUsers[k];
    });
    Object.keys(connectedWorkers).forEach(k => {
      if (connectedWorkers[k] === socket.id) delete connectedWorkers[k];
    });
    console.log('Socket disconnected:', socket.id);
  });
});

// Export io for use in controllers
module.exports.io = io;

// MongoDB Connection Setup
const initDB = async () => {
  let mongoUri = process.env.MONGO_URI;
  if (!mongoUri || mongoUri.includes('YOUR_USERNAME')) {
    console.log('⚠️ No real MongoDB URI found. Starting In-Memory MongoDB for local testing...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  }
  
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('✅ MongoDB Connected');
      
      // Seed default Test Worker and User if DB is empty
      await autoSeed();

      server.listen(process.env.PORT || 5000, '0.0.0.0', () => {
        console.log(`🚀 Servixo Server running on port ${process.env.PORT || 5000}`);
      });
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      process.exit(1);
    });
};

const autoSeed = async () => {
  try {
    const Worker = require('./models/Worker');
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');

    const workerEmail = 'pittalaadithyavarun555@gmail.com';
    const userEmail = 'pittala@gmail.com';
    const password = 'Password@123';

    const workerExists = await Worker.findOne({ email: workerEmail });
    if (!workerExists) {
      const hashed = await bcrypt.hash(password, 10);
      await Worker.create({
        name: 'Varun (Professional)',
        email: workerEmail,
        phone: '9999999999',
        password: hashed,
        skills: ['Plumbing', 'Electrical'],
        category: 'Maintenance',
        isAvailable: true,
        isActive: true,
        currentLocation: { lat: 17.3850, lng: 78.4867 }
      });
      console.log('👷 Default Worker seeded');
    }

    const userExists = await User.findOne({ email: userEmail });
    if (!userExists) {
      const hashed = await bcrypt.hash(password, 10);
      await User.create({
        name: 'Varun Customer',
        email: userEmail,
        password: hashed,
        phone: '1234567890'
      });
      console.log('👤 Default User seeded');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};

initDB();
