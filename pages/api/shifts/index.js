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
    
    let whereConditions = ['is_active = true'];
    let queryParams = [];
    let paramIndex = 1;
    
    if (hospital) {
      whereConditions.push(`hospital = $${paramIndex}`);
      queryParams.push(hospital);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const query = `
      SELECT * FROM shifts 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY date;
    `;

    const result = await sql.query(query, queryParams);
    
    // Convert to legacy format grouped by date
    const groupedShifts = {};
    result.rows.forEach(shift => {
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

    const shift = result.rows[0];

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
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
}