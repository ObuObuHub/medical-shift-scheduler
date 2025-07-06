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

    // Only managers and admins can manage shift types
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, start, end, duration, color } = req.body;
      
      const { rows } = await sql`
        UPDATE shift_types 
        SET name = ${name}, 
            start_time = ${start}, 
            end_time = ${end}, 
            duration = ${duration}, 
            color = ${color},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Shift type not found' });
      }
      
      const updated = rows[0];
      res.status(200).json({
        id: updated.id,
        name: updated.name,
        start: updated.start_time,
        end: updated.end_time,
        duration: updated.duration,
        color: updated.color
      });
    } catch (error) {
      console.error('Error updating shift type:', error);
      res.status(500).json({ error: 'Failed to update shift type' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { rowCount } = await sql`
        DELETE FROM shift_types 
        WHERE id = ${id}
      `;
      
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Shift type not found' });
      }
      
      res.status(200).json({ message: 'Shift type deleted successfully' });
    } catch (error) {
      console.error('Error deleting shift type:', error);
      res.status(500).json({ error: 'Failed to delete shift type' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}