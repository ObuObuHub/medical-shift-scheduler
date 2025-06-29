import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';
import cache, { cacheKeys, cacheTTL, invalidateCache } from '../../../lib/cache';

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
    
    // Check cache first
    const cacheKey = cacheKeys.shifts(hospital, startDate, endDate);
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
    
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
        coverage: shift.coverage,
        hospital: shift.hospital
      });
    });

    // Cache the result
    cache.set(cacheKey, groupedShifts, cacheTTL.shifts);
    res.setHeader('X-Cache', 'MISS');
    
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
      coverage: shift.coverage,
      hospital: shift.hospital
    };

    // Invalidate cache for this hospital
    invalidateCache.shifts(hospital);
    
    res.status(201).json(newShift);
  } catch (error) {
    console.error('Create shift error:', error);
    if (error.message && error.message.includes('duplicate key')) {
      // Check if this shift was previously deleted
      try {
        const existingShift = await sql`
          SELECT is_active FROM shifts WHERE shift_id = ${id}
        `;
        
        if (existingShift.length > 0 && existingShift[0].is_active === false) {
          // This shift was deleted - don't reactivate it!
          // Generate a new unique ID instead
          const newId = `${date}-${type.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const retryResult = await sql`
            INSERT INTO shifts (shift_id, date, shift_type, staff_ids, department, requirements, coverage, hospital, created_by)
            VALUES (
              ${newId},
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
          
          if (retryResult.length > 0) {
            const shift = retryResult[0];
            const newShift = {
              id: shift.shift_id,
              type: shift.shift_type,
              staffIds: shift.staff_ids,
              department: shift.department,
              requirements: shift.requirements,
              coverage: shift.coverage,
              hospital: shift.hospital
            };
            // Invalidate cache for this hospital
            invalidateCache.shifts(hospital);
            
            return res.status(201).json(newShift);
          }
        }
      } catch (updateError) {
        console.error('Retry shift creation error:', updateError);
      }
    }
    res.status(500).json({ 
      error: 'Failed to create shift',
      details: error.message || 'Database error'
    });
  }
}

async function deleteShift(req, res) {
  try {
    const { shiftId } = req.query;
    
    if (!shiftId) {
      return res.status(400).json({ error: 'Shift ID is required' });
    }

    // First try to soft delete
    const result = await sql`
      UPDATE shifts 
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = ${shiftId}
      RETURNING *;
    `;

    if (result.length === 0) {
      // Maybe the shift doesn't exist or has a different ID format
      // Try to find and delete by matching date and type pattern
      const parts = shiftId.split('-');
      if (parts.length >= 2) {
        const [date, ...rest] = parts;
        const typePattern = rest[0]; // Should be shift type like NOAPTE, GARDA_ZI, etc
        
        const alternativeResult = await sql`
          UPDATE shifts 
          SET is_active = false,
              updated_at = CURRENT_TIMESTAMP  
          WHERE date = ${date}
            AND shift_type->>'id' = ${typePattern}
            AND is_active = true
          RETURNING *;
        `;
        
        if (alternativeResult.length > 0) {
          return res.status(200).json({ 
            message: 'Shift deleted successfully (alternative match)',
            deletedCount: alternativeResult.length 
          });
        }
      }
      
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Invalidate cache for this hospital
    if (result[0] && result[0].hospital) {
      invalidateCache.shifts(result[0].hospital);
    }
    
    res.status(200).json({ 
      message: 'Shift deleted successfully',
      shift: result[0] 
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ 
      error: 'Failed to delete shift',
      details: error.message 
    });
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

    // Invalidate cache for this hospital
    invalidateCache.shifts(hospital);
    
    res.status(200).json({ 
      message: 'All shifts cleared successfully',
      clearedCount: result.length 
    });
  } catch (error) {
        res.status(500).json({ error: 'Failed to clear shifts' });
  }
}