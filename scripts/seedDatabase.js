// Database seeding script to populate default data
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Staff = require('../models/Staff');
const ShiftType = require('../models/ShiftType');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-scheduler';

const defaultHospitals = [
  { id: 'spital1', name: 'Spital Județean Urgență' },
  { id: 'spital2', name: 'Spital Municipal' },
  { id: 'spital3', name: 'Spital Pediatrie' }
];

const defaultShiftTypes = [
  {
    id: 'garda_zi',
    name: 'Gardă de Zi (12h)',
    start: '08:00',
    end: '20:00',
    color: '#10B981',
    duration: 12
  },
  {
    id: 'noapte',
    name: 'Tură de Noapte (12h)',
    start: '20:00',
    end: '08:00',
    color: '#F59E0B',
    duration: 12
  },
  {
    id: 'garda_24',
    name: 'Gardă 24 ore',
    start: '08:00',
    end: '08:00',
    color: '#EF4444',
    duration: 24
  }
];

const defaultStaff = [
  // Urgențe
  { name: 'Dr. Popescu Ion', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'manager', unavailable: [] },
  { name: 'Dr. Stanescu Mihai', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff', unavailable: [] },
  { name: 'Dr. Popa Stefan', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // Chirurgie
  { name: 'Dr. Ionescu Maria', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'manager', unavailable: [] },
  { name: 'Dr. Dumitrescu Paul', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff', unavailable: [] },
  { name: 'Dr. Vlad Carmen', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // ATI
  { name: 'Dr. Radulescu Alex', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff', unavailable: [] },
  { name: 'Dr. Constantinescu Ioana', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff', unavailable: [] },
  { name: 'Dr. Radu Ana', type: 'medic', specialization: 'ATI', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // Pediatrie
  { name: 'Dr. Gheorghe Andrei', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'manager', unavailable: [] },
  { name: 'Dr. Moraru Elena', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff', unavailable: [] },
  { name: 'Dr. Neagu Raluca', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff', unavailable: [] },
  
  // Cardiologie
  { name: 'Dr. Georgescu Radu', type: 'medic', specialization: 'Cardiologie', hospital: 'spital1', role: 'staff', unavailable: [] },
  { name: 'Dr. Cristea Adriana', type: 'medic', specialization: 'Cardiologie', hospital: 'spital1', role: 'staff', unavailable: [] },
  
  // Neurologie
  { name: 'Dr. Petrescu Dana', type: 'medic', specialization: 'Neurologie', hospital: 'spital1', role: 'staff', unavailable: [] },
  { name: 'Dr. Enache Monica', type: 'medic', specialization: 'Neurologie', hospital: 'spital1', role: 'staff', unavailable: [] }
];

const defaultUsers = [
  {
    name: 'Administrator Principal',
    username: 'admin',
    passwordHash: 'admin123', // Will be hashed by pre-save hook
    role: 'admin',
    hospital: 'spital1',
    type: 'medic'
  },
  {
    name: 'Manager Spital',
    username: 'manager',
    passwordHash: 'manager123', // Will be hashed by pre-save hook
    role: 'manager',
    hospital: 'spital1',
    type: 'medic'
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Hospital.deleteMany({}),
      Staff.deleteMany({}),
      ShiftType.deleteMany({})
    ]);

    // Create admin user first to get ID for foreign keys
    console.log('Creating admin user...');
    const adminUser = new User(defaultUsers[0]);
    await adminUser.save();

    const managerUser = new User(defaultUsers[1]);
    await managerUser.save();

    console.log('Seeding hospitals...');
    const hospitalPromises = defaultHospitals.map(hospital => {
      return new Hospital({
        ...hospital,
        createdBy: adminUser._id
      }).save();
    });
    await Promise.all(hospitalPromises);

    console.log('Seeding shift types...');
    const shiftTypePromises = defaultShiftTypes.map(shiftType => {
      return new ShiftType({
        ...shiftType,
        createdBy: adminUser._id
      }).save();
    });
    await Promise.all(shiftTypePromises);

    console.log('Seeding staff...');
    const staffPromises = defaultStaff.map(staff => {
      return new Staff({
        ...staff,
        createdBy: adminUser._id
      }).save();
    });
    await Promise.all(staffPromises);

    console.log('Database seeded successfully!');
    console.log('Default login credentials:');
    console.log('Admin: username=admin, password=admin123');
    console.log('Manager: username=manager, password=manager123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run seeding if script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;