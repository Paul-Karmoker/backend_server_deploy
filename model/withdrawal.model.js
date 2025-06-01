import mongoose from 'mongoose';
const { Schema } = mongoose;

const withdrawalSchema = new Schema({
  user:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  points:          { type: Number, required: true },
  paymentProvider: { type: String, enum: ['bkash','nagad'], required: true },
  paymentNumber:   { type: String, required: true },
  status:          { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  requestDate:     { type: Date, default: Date.now },
  processedDate:   Date,
  admin:           { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Withdrawal = mongoose.models.Withdrawal 
  || mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;
