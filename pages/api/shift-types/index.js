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

  // Verify authentication for non-GET requests
  if (req.method !== 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Only managers and admins can manage shift types
      if (!['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  const { hospital } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT * FROM shift_types 
        WHERE hospital = ${hospital} 
        ORDER BY name
      `;
      
      // Transform to object format expected by frontend
      const shiftTypes = {};
      rows.forEach(row => {
        shiftTypes[row.id.toUpperCase()] = {
          id: row.id,
          name: row.name,
          start: row.start_time,
          end: row.end_time,
          duration: row.duration,
          color: row.color
        };
      });
      
      res.status(200).json(shiftTypes);
    } catch (error) {
      console.error('Error fetching shift types:', error);
      res.status(500).json({ error: 'Failed to fetch shift types' });
    }
  } else if (req.method === 'POST') {
    try {
      const { id, name, start, end, duration, color } = req.body;
      
      const { rows } = await sql`
        INSERT INTO shift_types (id, name, start_time, end_time, duration, color, hospital)
        VALUES (${id}, ${name}, ${start}, ${end}, ${duration}, ${color}, ${hospital})
        RETURNING *
      `;
      
      const created = rows[0];
      res.status(201).json({
        id: created.id,
        name: created.name,
        start: created.start_time,
        end: created.end_time,
        duration: created.duration,
        color: created.color
      });
    } catch (error) {
      console.error('Error creating shift type:', error);
      res.status(500).json({ error: 'Failed to create shift type' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}