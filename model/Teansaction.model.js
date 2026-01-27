import mongoose from "mongoose";
const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["bkash"],
      required: true,
    },

    paymentID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    merchantInvoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    plan: {
      type: String,
      enum: ["monthly", "quarterly", "semiannual", "yearly"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "BDT",
    },

    payerReference: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["created", "success", "failed"],
      default: "created",
      index: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    executedAt: Date,

    rawResponse: Object,
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
