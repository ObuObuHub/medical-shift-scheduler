import connectToDatabase from '../../../lib/mongodb';
import Staff from '../../../models/Staff';
import { authMiddleware, requireRole } from '../../../lib/auth';

// Helper to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  try {
    await connectToDatabase();
    await runMiddleware(req, res, authMiddleware);

    switch (req.method) {
      case 'GET':
        return await getStaff(req, res);
      case 'POST':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await createStaff(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Staff API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getStaff(req, res) {
  try {
    const { hospital } = req.query;
    
    let query = { isActive: true };
    if (hospital) {
      query.hospital = hospital;
    }

    const staff = await Staff.find(query).sort({ name: 1 });
    
    // Convert to legacy format for compatibility
    const legacyStaff = staff.map(s => ({
      id: s._id.toString(),
      name: s.name,
      type: s.type,
      specialization: s.specialization,
      hospital: s.hospital,
      role: s.role,
      unavailable: s.unavailable || []
    }));

    res.status(200).json(legacyStaff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
}

async function createStaff(req, res) {
  try {
    const { name, type, specialization, hospital, role } = req.body;

    if (!name || !specialization || !hospital) {
      return res.status(400).json({ error: 'Name, specialization, and hospital are required' });
    }

    const staff = new Staff({
      name: name.trim(),
      type: type || 'medic',
      specialization,
      hospital,
      role: role || 'staff',
      unavailable: [],
      createdBy: req.user._id
    });

    await staff.save();

    const newStaff = {
      id: staff._id.toString(),
      name: staff.name,
      type: staff.type,
      specialization: staff.specialization,
      hospital: staff.hospital,
      role: staff.role,
      unavailable: staff.unavailable || []
    };

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
}