const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
  day: { type: String, required: true },
  time: { type: String, required: true }
});

const ConsultantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  image: { type: String, required: true },
  bio: { type: String, required: true },
  expertise: { type: [String], required: true },
  availability: { type: [AvailabilitySchema], required: true },
  email: { type: String, required: true }
});

module.exports = mongoose.model('Consultant', ConsultantSchema);