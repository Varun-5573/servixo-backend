const io = require('socket.io-client');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('✅ Connected to Servixo Backend');
  console.log('📡 Sending Test Booking Update...');
  
  // Join the admin room just like the dashboard does
  socket.emit('admin_join');
  
  setTimeout(() => {
    // Send a mock booking event
    socket.emit('booking_status_update', { 
      bookingId: 'MOCK_TEST_007', 
      status: 'accepted', 
      userId: 'TEST_USER_ID' 
    });
    
    console.log('🚀 Test Signal Sent! Check your Control Panel feed.');
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection Error:', err.message);
  process.exit(1);
});
