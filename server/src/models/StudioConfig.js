import mongoose from 'mongoose';

const studioConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    muralRatePerSqFt: {
      type: Number,
      default: 150
    }
  },
  { timestamps: true }
);

const StudioConfig = mongoose.model('StudioConfig', studioConfigSchema);
export default StudioConfig;
