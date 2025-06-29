import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';
import cache, { cacheKeys, cacheTTL } from '../../../lib/cache';

export default async function handler(req, res) {
  try {
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
        return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getHospitals(req, res) {
  try {
    // Check cache first
    const cacheKey = cacheKeys.hospitals();
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
    
    const result = await sql`
      SELECT * FROM hospitals WHERE is_active = true ORDER BY name;
    `;
    
    // Convert to legacy format for compatibility
    const legacyHospitals = result.map(h => ({
      id: h.hospital_id,
      name: h.name
    }));

    // Cache the result
    cache.set(cacheKey, legacyHospitals, cacheTTL.hospitals);
    res.setHeader('X-Cache', 'MISS');
    
    res.status(200).json(legacyHospitals);
  } catch (error) {
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

    const result = await sql`
      INSERT INTO hospitals (hospital_id, name, address, created_by)
      VALUES (${hospitalId}, ${name.trim()}, ${address?.trim() || null}, ${req.user.id})
      RETURNING *;
    `;

    const hospital = result[0];

    const newHospital = {
      id: hospital.hospital_id,
      name: hospital.name
    };

    res.status(201).json(newHospital);
  } catch (error) {
        res.status(500).json({ error: 'Failed to create hospital' });
  }
}