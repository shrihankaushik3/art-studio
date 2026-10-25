import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    paintingId: {
      type: String,
      required: true
    },
    paintingTitle: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
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
    status: {
      type: String,
      enum: ['placed', 'cancelled'],
      default: 'placed',
      index: true
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Database constraint: Each painting can have at most one active ('placed') order.
orderSchema.index(
  { paintingId: 1 },
  { unique: true, partialFilterExpression: { status: 'placed' } }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
