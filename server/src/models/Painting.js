import mongoose from 'mongoose';

const paintingSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    artist: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be non-negative']
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['available', 'sold'],
      default: 'available',
      index: true
    },
    activeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Painting = mongoose.model('Painting', paintingSchema);
export default Painting;
