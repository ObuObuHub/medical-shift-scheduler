import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';
import cache, { cacheKeys, cacheTTL, invalidateCache } from '../../../lib/cache';

export default async function handler(req, res) {
  try {
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
        return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getStaff(req, res) {
  try {
    const { hospital } = req.query;
    
    // Check cache first
    const cacheKey = cacheKeys.staff(hospital);
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
    
    let result;
    if (hospital) {
      result = await sql`SELECT * FROM staff WHERE is_active = true AND hospital = ${hospital} ORDER BY name`;
    } else {
      result = await sql`SELECT * FROM staff WHERE is_active = true ORDER BY name`;
    }
    
    // Convert to legacy format for compatibility
    const legacyStaff = result.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      specialization: s.specialization,
      hospital: s.hospital,
      role: s.role,
      unavailable: s.unavailable || [],
      maxGuardsPerMonth: s.max_guards_per_month || 10
    }));

    // Cache the result
    cache.set(cacheKey, legacyStaff, cacheTTL.staff);
    res.setHeader('X-Cache', 'MISS');
    
    res.status(200).json(legacyStaff);
  } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff' });
  }
}

async function createStaff(req, res) {
  try {
    const { name, type, specialization, hospital, role, maxGuardsPerMonth } = req.body;

    if (!name || !specialization || !hospital) {
      return res.status(400).json({ error: 'Name, specialization, and hospital are required' });
    }

    // Log the request for debugging
    console.log('Creating staff:', { name, type, specialization, hospital, role, user: req.user.username });

    // Check if max_guards_per_month column exists
    let hasMaxGuardsColumn = true;
    try {
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'staff' 
        AND column_name = 'max_guards_per_month'
        LIMIT 1;
      `;
      hasMaxGuardsColumn = columnCheck.length > 0;
    } catch (e) {
      console.log('Column check error:', e.message);
      hasMaxGuardsColumn = false;
    }

    let result;
    if (hasMaxGuardsColumn) {
      result = await sql`
        INSERT INTO staff (name, type, specialization, hospital, role, max_guards_per_month, created_by)
        VALUES (${name.trim()}, ${type || 'medic'}, ${specialization}, ${hospital}, ${role || 'staff'}, ${maxGuardsPerMonth || 10}, ${req.user.id})
        RETURNING *;
      `;
    } else {
      // Insert without max_guards_per_month if column doesn't exist
      console.log('Inserting without max_guards_per_month column');
      result = await sql`
        INSERT INTO staff (name, type, specialization, hospital, role, created_by)
        VALUES (${name.trim()}, ${type || 'medic'}, ${specialization}, ${hospital}, ${role || 'staff'}, ${req.user.id})
        RETURNING *;
      `;
    }

    if (!result || result.length === 0) {
      console.error('No result returned from INSERT');
      return res.status(500).json({ error: 'Database insert failed - no result returned' });
    }

    const staff = result[0];

    const newStaff = {
      id: staff.id,
      name: staff.name,
      type: staff.type,
      specialization: staff.specialization,
      hospital: staff.hospital,
      role: staff.role,
      unavailable: staff.unavailable || [],
      maxGuardsPerMonth: staff.max_guards_per_month || maxGuardsPerMonth || 10
    };

    // Invalidate cache for this hospital
    invalidateCache.staff(hospital);
    
    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: `Failed to create staff member: ${error.message}` });
  }
}