import mongoose from 'mongoose';

const wallBookingSchema = new mongoose.Schema(
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
    date: {
      type: String, // Normalized 'YYYY-MM-DD'
      required: true
    },
    areaSqFt: {
      type: Number,
      required: true,
      min: [10, 'Area must be at least 10 square feet'],
      max: [500, 'Area cannot exceed 500 square feet']
    },
    ratePerSqFt: {
      type: Number,
      required: true,
      default: 150
    },
    price: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'declined', 'cancelled'],
      default: 'requested',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Database constraint: A date can have at most one active booking ('requested' or 'confirmed')
wallBookingSchema.index(
  { date: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['requested', 'confirmed'] }
    }
  }
);

const WallBooking = mongoose.model('WallBooking', wallBookingSchema);
export default WallBooking;
