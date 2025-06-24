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

    const { id } = req.query;

    switch (req.method) {
      case 'PUT':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await updateStaff(req, res, id);
      case 'DELETE':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await deleteStaff(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Staff API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateStaff(req, res, id) {
  try {
    const updates = req.body;
    
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Update allowed fields
    const allowedFields = ['name', 'type', 'specialization', 'hospital', 'role', 'unavailable'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        staff[field] = updates[field];
      }
    });

    await staff.save();

    const updatedStaff = {
      id: staff._id.toString(),
      name: staff.name,
      type: staff.type,
      specialization: staff.specialization,
      hospital: staff.hospital,
      role: staff.role,
      unavailable: staff.unavailable || []
    };

    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
}

async function deleteStaff(req, res, id) {
  try {
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Soft delete
    staff.isActive = false;
    await staff.save();

    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
}