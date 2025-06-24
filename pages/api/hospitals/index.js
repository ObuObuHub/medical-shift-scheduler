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

    switch (req.method) {
      case 'GET':
        return await getHospitals(req, res);
      case 'POST':
        await runMiddleware(req, res, requireRole(['admin']));
        return await createHospital(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Hospitals API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getHospitals(req, res) {
  try {
    const hospitals = await Hospital.find({ isActive: true }).sort({ name: 1 });
    
    // Convert to legacy format for compatibility
    const legacyHospitals = hospitals.map(h => ({
      id: h.id,
      name: h.name
    }));

    res.status(200).json(legacyHospitals);
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
}

async function createHospital(req, res) {
  try {
    const { name, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }

    // Generate unique ID
    const hospitalId = `spital${Date.now()}`;

    const hospital = new Hospital({
      id: hospitalId,
      name: name.trim(),
      address: address?.trim(),
      createdBy: req.user._id
    });

    await hospital.save();

    const newHospital = {
      id: hospital.id,
      name: hospital.name
    };

    res.status(201).json(newHospital);
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({ error: 'Failed to create hospital' });
  }
}