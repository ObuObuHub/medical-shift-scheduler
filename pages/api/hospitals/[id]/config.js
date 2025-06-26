import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id: hospitalId } = req.query;

  if (req.method === 'GET') {
    // Get hospital configuration
    try {
      const { rows } = await sql`
        SELECT 
          hsc.*,
          h.name as hospital_name
        FROM hospital_shift_config hsc
        JOIN hospitals h ON hsc.hospital_id = h.hospital_id
        WHERE hsc.hospital_id = ${hospitalId} AND hsc.is_active = true
      `;

      if (rows.length === 0) {
        // Return default configuration if none exists
        const defaultConfig = {
          hospital_id: hospitalId,
          shift_pattern: 'standard_12_24',
          weekday_shifts: ['NOAPTE'],
          weekend_shifts: ['GARDA_ZI', 'NOAPTE', 'GARDA_24'],
          holiday_shifts: ['GARDA_24'],
          min_staff_per_shift: 1,
          max_consecutive_nights: 1,
          max_shifts_per_month: 10,
          shift_types: {
            GARDA_ZI: {
              id: 'GARDA_ZI',
              name: 'Gardă Zi',
              start: '08:00',
              end: '20:00',
              color: '#3B82F6',
              duration: 12
            },
            NOAPTE: {
              id: 'NOAPTE',
              name: 'Noapte',
              start: '20:00',
              end: '08:00',
              color: '#7C3AED',
              duration: 12
            },
            GARDA_24: {
              id: 'GARDA_24',
              name: 'Gardă 24h',
              start: '08:00',
              end: '08:00',
              color: '#10B981',
              duration: 24
            }
          },
          rules: {
            allow_consecutive_weekends: false,
            min_rest_hours: 12
          }
        };
        return res.status(200).json(defaultConfig);
      }

      res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Error fetching hospital config:', error);
      res.status(500).json({ error: 'Failed to fetch hospital configuration' });
    }
  } else if (req.method === 'PUT') {
    // Update hospital configuration (admin only)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update hospital configuration' });
    }

    const {
      shiftPattern,
      weekdayShifts,
      weekendShifts,
      holidayShifts,
      minStaffPerShift,
      maxConsecutiveNights,
      maxShiftsPerMonth,
      shiftTypes,
      rules
    } = req.body;

    try {
      // Check if configuration exists
      const { rows: existingRows } = await sql`
        SELECT id FROM hospital_shift_config 
        WHERE hospital_id = ${hospitalId} AND is_active = true
      `;

      let result;
      if (existingRows.length > 0) {
        // Update existing configuration
        result = await sql`
          UPDATE hospital_shift_config
          SET 
            shift_pattern = ${shiftPattern},
            weekday_shifts = ${JSON.stringify(weekdayShifts)},
            weekend_shifts = ${JSON.stringify(weekendShifts)},
            holiday_shifts = ${JSON.stringify(holidayShifts)},
            min_staff_per_shift = ${minStaffPerShift},
            max_consecutive_nights = ${maxConsecutiveNights},
            max_shifts_per_month = ${maxShiftsPerMonth},
            shift_types = ${JSON.stringify(shiftTypes)},
            rules = ${JSON.stringify(rules)},
            updated_at = CURRENT_TIMESTAMP,
            created_by = ${req.user.username}
          WHERE hospital_id = ${hospitalId} AND is_active = true
          RETURNING *
        `;
      } else {
        // Create new configuration
        result = await sql`
          INSERT INTO hospital_shift_config (
            hospital_id,
            shift_pattern,
            weekday_shifts,
            weekend_shifts,
            holiday_shifts,
            min_staff_per_shift,
            max_consecutive_nights,
            max_shifts_per_month,
            shift_types,
            rules,
            created_by
          ) VALUES (
            ${hospitalId},
            ${shiftPattern},
            ${JSON.stringify(weekdayShifts)},
            ${JSON.stringify(weekendShifts)},
            ${JSON.stringify(holidayShifts)},
            ${minStaffPerShift},
            ${maxConsecutiveNights},
            ${maxShiftsPerMonth},
            ${JSON.stringify(shiftTypes)},
            ${JSON.stringify(rules)},
            ${req.user.username}
          )
          RETURNING *
        `;
      }

      res.status(200).json({ 
        message: 'Hospital configuration updated successfully', 
        config: result.rows[0] 
      });
    } catch (error) {
      console.error('Error updating hospital config:', error);
      res.status(500).json({ error: 'Failed to update hospital configuration' });
    }
  } else if (req.method === 'DELETE') {
    // Soft delete configuration (admin only)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete hospital configuration' });
    }

    try {
      await sql`
        UPDATE hospital_shift_config
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE hospital_id = ${hospitalId}
      `;

      res.status(200).json({ message: 'Hospital configuration deleted successfully' });
    } catch (error) {
      console.error('Error deleting hospital config:', error);
      res.status(500).json({ error: 'Failed to delete hospital configuration' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}