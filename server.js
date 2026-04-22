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
app.use('/uploads', express.static('uploads'));

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
app.use('/api/version', require('./routes/versionRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/referral', require('./routes/referralRoutes'));

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
    try {
      // Broadcast to user tracking this worker
      if (bookingId) {
        io.to(`booking_${bookingId}`).emit('live_location', { workerId, lat, lng });
      }
      // Broadcast to admin
      io.to('admin_room').emit('worker_location', { workerId, lat, lng });

      // Update in DB
      const Worker = require('./models/Worker');
      await Worker.findByIdAndUpdate(workerId, {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        'currentLocation.updatedAt': new Date()
      });
    } catch (e) {}
  });

  // User live location update (Swiggy/Zomato style broadcast)
  socket.on('user_location_update', async (data) => {
    const { userId, lat, lng, bookingId } = data;
    
    try {
      const User = require('./models/User');
      const Booking = require('./models/Booking');
      
      const user = await User.findById(userId);
      let serviceName = 'Service';
      
      // If we have a booking ID, get the service name
      if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking) serviceName = booking.service;
      }

      // Broadcast RICH data to admin
      io.to('admin_room').emit('user_location', { 
        userId, 
        name: user ? user.name : 'Customer',
        service: serviceName,
        bookingId,
        lat, 
        lng 
      });

      // Update in DB
      if (user) {
        await User.findByIdAndUpdate(userId, {
          'location.lat': lat,
          'location.lng': lng
        });
      }
    } catch (e) {
      console.error('Error in user location broadcast:', e);
    }
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
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to In-Memory MongoDB');
    await autoSeed();
    server.listen(process.env.PORT || 5000, '0.0.0.0', () => {
      console.log(`🚀 Servixo Server running on port ${process.env.PORT || 5000} [In-Memory]`);
    });
    return;
  }
  
  const startServer = async (uri, label) => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB Connected (${label})`);
    await autoSeed();
    server.listen(process.env.PORT || 5000, '0.0.0.0', () => {
      console.log(`🚀 Servixo Server running on port ${process.env.PORT || 5000} [${label}]`);
    });
  };

  try {
    await startServer(mongoUri, 'Atlas');
  } catch (err) {
    console.error('❌ MongoDB Atlas failed:', err.message);
    console.log('⚠️ Falling back to In-Memory MongoDB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      await startServer(mongoServer.getUri(), 'In-Memory');
    } catch (fallbackErr) {
      console.error('❌ Failed to start with In-Memory DB:', fallbackErr.message);
      process.exit(1);
    }
  }
};

const autoSeed = async () => {
  try {
    const Worker = require('./models/Worker');
    const User = require('./models/User');
    const Booking = require('./models/Booking');
    const Payment = require('./models/Payment');
    const bcrypt = require('bcryptjs');

    const password = 'Password@123';
    const hashed = await bcrypt.hash(password, 10);

    // Seed Workers if needed
    const workerCount = await Worker.countDocuments();
    if (workerCount < 3) {
      await Worker.create([
        {
          name: 'Varun (Plumber)', email: 'pittalaadithyavarun555@gmail.com', phone: '9999999999',
          password: hashed, skills: ['Plumbing'], category: 'Maintenance',
          isAvailable: true, isVerified: true, isActive: true, currentLocation: { lat: 17.3850, lng: 78.4867 }
        },
        {
          name: 'Siri (Electrician)', email: 'siri@gmail.com', phone: '8888888888',
          password: hashed, skills: ['Electrical'], category: 'Maintenance',
          isAvailable: true, isVerified: true, isActive: true, currentLocation: { lat: 17.4050, lng: 78.4967 }
        },
        {
          name: 'Bunny (Cleaning)', email: 'bunny@gmail.com', phone: '7777777777',
          password: hashed, skills: ['Cleaning'], category: 'Home Services',
          isAvailable: true, isVerified: true, isActive: true, currentLocation: { lat: 17.3750, lng: 78.4767 }
        }
      ]);
      console.log('👷 Workers seeded (Verified)');
    }

    // Seed Users if needed
    const userCount = await User.countDocuments();
    if (userCount < 3) {
      await User.create([
        { name: 'Adithya Customer', email: 'pittala@gmail.com', phone: '1234567890', password: hashed, location: { lat: 17.4120, lng: 78.4550 } },
        { name: 'Bonda Customer', email: 'bonda@gmail.com', phone: '1231231234', password: hashed, location: { lat: 17.3950, lng: 78.5000 } },
        { name: 'Rahul Customer', email: 'rahul@gmail.com', phone: '1234444444', password: hashed, location: { lat: 17.3600, lng: 78.4800 } }
      ]);
      console.log('👤 Users seeded');
    }

    // Seed some Bookings if needed
    const bookingCount = await Booking.countDocuments();
    if (bookingCount === 0) {
      const users = await User.find().limit(3);
      
      const createdBookings = await Booking.create([
        { userId: users[0]._id, service: 'Plumbing Leakage', category: 'Maintenance', price: 499, status: 'ongoing', scheduledTime: new Date(), location: { address: '12 MG Road, Hyderabad', lat: 17.4120, lng: 78.4550 } },
        { userId: users[1]._id, service: 'Deep Cleaning', category: 'Home Services', price: 1299, status: 'pending', scheduledTime: new Date(), location: { address: '45 Banjara Hills, Hyderabad', lat: 17.3950, lng: 78.5000 } },
        { userId: users[2]._id, service: 'Fan Repair', category: 'Maintenance', price: 299, status: 'accepted', scheduledTime: new Date(Date.now() + 3600000), location: { address: '78 Jubilee Hills, Hyderabad', lat: 17.3600, lng: 78.4800 } },
        { userId: users[0]._id, service: 'AC Installation', category: 'Maintenance', price: 1500, status: 'completed', scheduledTime: new Date(Date.now() - 86400000 * 5), location: { address: '12 MG Road, Hyderabad', lat: 17.4120, lng: 78.4550 } }
      ]);

      // Seed some Payments using the created bookings
      await Payment.create([
        { bookingId: createdBookings[0]._id, userId: users[0]._id, amount: 499, status: 'success', paymentMethod: 'UPI' },
        { bookingId: createdBookings[3]._id, userId: users[0]._id, amount: 1500, status: 'success', paymentMethod: 'Card' }
      ]);

      console.log('📅 Bookings & Payments seeded');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};

initDB();
