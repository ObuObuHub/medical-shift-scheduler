import mongoose from 'mongoose';

const StaffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['medic'],
    default: 'medic'
  },
  specialization: {
    type: String,
    required: true,
    enum: [
      'Urgențe',
      'Chirurgie', 
      'ATI',
      'Pediatrie',
      'Cardiologie',
      'Neurologie',
      'Ortopedice',
      'Ginecologie',
      'Oftalmologie',
      'Laborator',
      'Medicină Internă'
    ]
  },
  hospital: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['staff', 'manager', 'admin'],
    default: 'staff'
  },
  unavailable: [{
    type: Date
  }],
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

export default mongoose.models.Staff || mongoose.model('Staff', StaffSchema);