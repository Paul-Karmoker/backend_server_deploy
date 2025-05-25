import mongoose from 'mongoose';
const { Schema } = mongoose;

const transactionSchema = new Schema({
  user:                 { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paymentID:            { type: String, required: true, unique: true },
  plan:                 { type: String, enum: ['monthly','quarterly','semiannual','annual'], required: true },
  amount:               { type: Number, required: true },
  phoneNumber:          { type: String, required: true },
  paymentReference:     { type: String, required: true },
  status:               { type: String, enum: ['created','executed','failed'], default: 'created' },
  requestedAt:          { type: Date, default: Date.now },
  executedAt:           Date,
}, { timestamps: true });

export default mongoose.models.BkashTransaction
  || mongoose.model('BkashTransaction', transactionSchema);
