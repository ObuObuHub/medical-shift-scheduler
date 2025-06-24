import connectToDatabase from '../../../lib/mongodb';
import Shift from '../../../models/Shift';
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
        return await getShifts(req, res);
      case 'POST':
        await runMiddleware(req, res, requireRole(['admin', 'manager', 'staff']));
        return await createShift(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Shifts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getShifts(req, res) {
  try {
    const { hospital, startDate, endDate } = req.query;
    
    let query = { isActive: true };
    
    if (hospital) {
      query.hospital = hospital;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const shifts = await Shift.find(query).sort({ date: 1 });
    
    // Convert to legacy format grouped by date
    const groupedShifts = {};
    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      
      if (!groupedShifts[dateKey]) {
        groupedShifts[dateKey] = [];
      }
      
      groupedShifts[dateKey].push({
        id: shift.id,
        type: shift.type,
        staffIds: shift.staffIds,
        department: shift.department,
        requirements: shift.requirements,
        coverage: shift.coverage
      });
    });

    res.status(200).json(groupedShifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
}

async function createShift(req, res) {
  try {
    const { 
      id, 
      date, 
      type, 
      staffIds, 
      department, 
      requirements, 
      coverage, 
      hospital 
    } = req.body;

    if (!id || !date || !type || !staffIds || !hospital) {
      return res.status(400).json({ 
        error: 'ID, date, type, staffIds, and hospital are required' 
      });
    }

    const shift = new Shift({
      id,
      date: new Date(date),
      type,
      staffIds,
      department,
      requirements: requirements || { minDoctors: 1, specializations: [] },
      coverage: coverage || { adequate: false, warnings: [], recommendations: [], staffBreakdown: { doctors: 0, total: 0 } },
      hospital,
      createdBy: req.user._id
    });

    await shift.save();

    const newShift = {
      id: shift.id,
      type: shift.type,
      staffIds: shift.staffIds,
      department: shift.department,
      requirements: shift.requirements,
      coverage: shift.coverage
    };

    res.status(201).json(newShift);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
}