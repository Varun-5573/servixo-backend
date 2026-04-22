const Message = require('../models/Message');

// OpenAI is optional - only use if API key is provided
let openai = null;
try {
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('YOUR_')) {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch(e) {}


// Send message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, senderType, bookingId, type } = req.body;
    const msg = await Message.create({
      senderId: req.user.id,
      receiverId,
      message,
      senderType: senderType || 'user',
      bookingId: bookingId || null,
      type: type || 'text'
    });

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('receive_message', msg);
      io.to(`worker_${receiverId}`).emit('receive_message', msg);
      io.to('admin_room').emit('receive_message', msg);

      // --- AUTOMATIC CHATBOT INTEGRATION (Advanced AI Logic) ---
      if (receiverId === 'admin' && (senderType === 'user' || senderType === 'worker')) {
        // 1. Show Typing Animation on Phone
        io.to(`user_${req.user.id}`).emit('receive_message', {
          senderId: 'bot',
          message: '...',
          senderType: 'bot',
          createdAt: new Date()
        });

        setTimeout(async () => {
          let botMsg = "Hello! I am the Servixo AI Support Bot 🤖. How can I help you today?";
          
          const msgLower = message.toLowerCase();
          if (msgLower.includes("problem") || msgLower.includes("issue") || msgLower.includes("not working")) {
            botMsg = "I'm sorry to hear that! Our human support team has been alerted. While they join, could you tell me more about the problem?";
          } else if (msgLower.includes("price") || msgLower.includes("cost") || msgLower.includes("how much")) {
            botMsg = "All our prices are fixed and shown upfront in the app. Just select a service to see the cost!";
          } else if (msgLower.includes("hello") || msgLower.includes("hi")) {
            botMsg = "Hi there! I'm your Servixo AI. I can help you with bookings, tracking experts, or payments. What do you need today?";
          } else if (msgLower.includes("track") || msgLower.includes("where")) {
            botMsg = "You can track your assigned expert live on the map in the 'My Bookings' section!";
          }
          
          const autoReply = await Message.create({
            senderId: 'admin',
            receiverId: req.user.id,
            message: botMsg,
            senderType: 'admin'
          });
          
          // 2. Remove Typing and send Actual Message
          io.to(`user_${req.user.id}`).emit('receive_message', autoReply);
          io.to('admin_room').emit('receive_message', autoReply);
        }, 1500); // 1.5 second delay for realistic feel
      }
    }

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get messages between two users
const getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id }
      ]
    }).sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all conversations (Admin)
const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(200);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin send message to user
const adminSendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const msg = await Message.create({
      senderId: 'admin',
      receiverId,
      message,
      senderType: 'admin',
      type: 'text'
    });
    const io = req.app.get('io');
    if (io) io.to(`user_${receiverId}`).emit('receive_message', msg);
    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// AI Chatbot
const aiChatbot = async (req, res) => {
  try {
    const { message } = req.body;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are Servixo Assistant, a helpful AI for a home services app like Urban Company. 
          You help users with: booking services, checking order status, payment issues, finding the right service, 
          and general support. Be friendly, professional, and concise. 
          Available services: Plumbing, Electrical, Cleaning, AC Repair, Painting, Carpentry, Appliance Repair.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 300
    });

    const reply = completion.choices[0].message.content;

    // Save bot message
    const botMsg = await Message.create({
      senderId: 'bot',
      receiverId: req.user.id,
      message: reply,
      senderType: 'bot',
      type: 'bot'
    });

    const io = req.app.get('io');
    if (io) io.to(`user_${req.user.id}`).emit('receive_message', botMsg);

    res.json({ success: true, reply, message: botMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'AI service unavailable', error: err.message });
  }
};

module.exports = { sendMessage, getMessages, getAllMessages, adminSendMessage, aiChatbot };
