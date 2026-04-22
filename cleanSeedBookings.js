const mongoose = require('mongoose');
require('dotenv').config();

const bookingSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  service: String,
  status: String,
  location: { lat: Number, lng: Number, address: String },
  createdAt: Date
});
const Booking = mongoose.model('Booking', bookingSchema);

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB...');

  // Delete bookings where location is exactly the Hyderabad seed defaults
  const deleted = await Booking.deleteMany({
    $or: [
      { 'location.lat': 17.385,  'location.lng': 78.4867 },
      { 'location.lat': 17.3950, 'location.lng': 78.5000 },
      { 'location.lat': 17.3600, 'location.lng': 78.4800 },
      { 'location.lat': 17.4120, 'location.lng': 78.4550 },
      { 'location.lat': 17.3850, 'location.lng': 78.4867 },
    ]
  });
  console.log('✅ Deleted', deleted.deletedCount, 'fake seed bookings with Hyderabad coords');

  const remaining = await Booking.find({ status: { $in: ['pending', 'accepted', 'ongoing'] } });
  console.log('📊 Active bookings remaining:', remaining.length);
  remaining.forEach(b => {
    console.log(` - ${b.service} | lat: ${b.location?.lat} | lng: ${b.location?.lng}`);
  });

  mongoose.disconnect();
  console.log('Done!');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
