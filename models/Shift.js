import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    color: { type: String, required: true },
    duration: { type: Number, required: true }
  },
  staffIds: [{
    type: Number,
    required: true
  }],
  department: {
    type: String,
    trim: true
  },
  requirements: {
    minDoctors: {
      type: Number,
      default: 1,
      min: 1
    },
    specializations: [{
      type: String
    }]
  },
  hospital: {
    type: String,
    required: true
  },
  coverage: {
    adequate: { type: Boolean, default: false },
    warnings: [{ type: String }],
    recommendations: [{ type: String }],
    staffBreakdown: {
      doctors: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
ShiftSchema.index({ date: 1, hospital: 1 });
ShiftSchema.index({ staffIds: 1 });

export default mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);