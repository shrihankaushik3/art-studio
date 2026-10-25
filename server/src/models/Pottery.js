import mongoose from 'mongoose';

const potteryItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

const glazeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

const potteryRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerEmail: {
      type: String,
      required: true
    },
    potteryItemId: {
      type: String,
      required: true
    },
    potteryItemName: {
      type: String,
      required: true
    },
    glazeId: {
      type: String,
      required: true
    },
    glazeName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [12, 'Quantity cannot exceed 12']
    },
    neededByDate: {
      type: String, // Normalized 'YYYY-MM-DD'
      required: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'declined', 'cancelled'],
      default: 'requested',
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const PotteryItem = mongoose.model('PotteryItem', potteryItemSchema);
export const Glaze = mongoose.model('Glaze', glazeSchema);
export const PotteryRequest = mongoose.model('PotteryRequest', potteryRequestSchema);
