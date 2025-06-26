import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    switch (req.method) {
      case 'GET':
        return await getShifts(req, res);
      case 'POST':
        await runMiddleware(req, res, requireRole(['admin', 'manager', 'staff']));
        return await createShift(req, res);
      case 'DELETE':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        if (req.query.action === 'clear-all') {
          return await clearAllShifts(req, res);
        } else {
          return await deleteShift(req, res);
        }
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getShifts(req, res) {
  try {
    const { hospital, startDate, endDate } = req.query;
    
    let result;
    
    if (hospital && startDate && endDate) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND hospital = ${hospital} AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date;
      `;
    } else if (hospital && startDate) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND hospital = ${hospital} AND date >= ${startDate}
        ORDER BY date;
      `;
    } else if (hospital) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND hospital = ${hospital}
        ORDER BY date;
      `;
    } else if (startDate && endDate) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date;
      `;
    } else {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true
        ORDER BY date;
      `;
    }
    
    // Convert to legacy format grouped by date
    const groupedShifts = {};
    result.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      
      if (!groupedShifts[dateKey]) {
        groupedShifts[dateKey] = [];
      }
      
      groupedShifts[dateKey].push({
        id: shift.shift_id,
        type: shift.shift_type,
        staffIds: shift.staff_ids,
        department: shift.department,
        requirements: shift.requirements,
        coverage: shift.coverage
      });
    });

    res.status(200).json(groupedShifts);
  } catch (error) {
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

    const result = await sql`
      INSERT INTO shifts (shift_id, date, shift_type, staff_ids, department, requirements, coverage, hospital, created_by)
      VALUES (
        ${id},
        ${date},
        ${JSON.stringify(type)},
        ${JSON.stringify(staffIds)},
        ${department || null},
        ${JSON.stringify(requirements || { minDoctors: 1, specializations: [] })},
        ${JSON.stringify(coverage || { adequate: false, warnings: [], recommendations: [], staffBreakdown: { doctors: 0, total: 0 } })},
        ${hospital},
        ${req.user.id}
      )
      RETURNING *;
    `;

    const shift = result[0];

    const newShift = {
      id: shift.shift_id,
      type: shift.shift_type,
      staffIds: shift.staff_ids,
      department: shift.department,
      requirements: shift.requirements,
      coverage: shift.coverage
    };

    res.status(201).json(newShift);
  } catch (error) {
        res.status(500).json({ error: 'Failed to create shift' });
  }
}

async function deleteShift(req, res) {
  try {
    const { shiftId } = req.query;
    
    if (!shiftId) {
      return res.status(400).json({ error: 'Shift ID is required' });
    }

    const result = await sql`
      UPDATE shifts 
      SET is_active = false 
      WHERE shift_id = ${shiftId}
      RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.status(200).json({ message: 'Shift deleted successfully' });
  } catch (error) {
        res.status(500).json({ error: 'Failed to delete shift' });
  }
}

async function clearAllShifts(req, res) {
  try {
    const { hospital, startDate, endDate } = req.query;
    
    if (!hospital) {
      return res.status(400).json({ error: 'Hospital is required' });
    }

    let result;
    
    if (startDate && endDate) {
      // Clear shifts for specific date range
      result = await sql`
        UPDATE shifts 
        SET is_active = false 
        WHERE hospital = ${hospital} AND date >= ${startDate} AND date <= ${endDate}
        RETURNING shift_id;
      `;
    } else {
      // Clear all shifts for hospital
      result = await sql`
        UPDATE shifts 
        SET is_active = false 
        WHERE hospital = ${hospital}
        RETURNING shift_id;
      `;
    }

    res.status(200).json({ 
      message: 'All shifts cleared successfully',
      clearedCount: result.length 
    });
  } catch (error) {
        res.status(500).json({ error: 'Failed to clear shifts' });
  }
}