import connectToDatabase from '../../../lib/mongodb';
import Hospital from '../../../models/Hospital';
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
    await runMiddleware(req, res, requireRole(['admin']));

    const { id } = req.query;

    switch (req.method) {
      case 'PUT':
        return await updateHospital(req, res, id);
      case 'DELETE':
        return await deleteHospital(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Hospital API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateHospital(req, res, id) {
  try {
    const { name, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }

    const hospital = await Hospital.findOne({ id, isActive: true });
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    hospital.name = name.trim();
    if (address !== undefined) {
      hospital.address = address?.trim();
    }

    await hospital.save();

    const updatedHospital = {
      id: hospital.id,
      name: hospital.name
    };

    res.status(200).json(updatedHospital);
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
}

async function deleteHospital(req, res, id) {
  try {
    const hospital = await Hospital.findOne({ id, isActive: true });
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // Check if there are other active hospitals
    const activeHospitalsCount = await Hospital.countDocuments({ isActive: true });
    if (activeHospitalsCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last hospital' });
    }

    // Soft delete
    hospital.isActive = false;
    await hospital.save();

    res.status(200).json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
}