import { initializeTables, seedDefaultData } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Only allow database initialization in development or by admin users
    if (process.env.NODE_ENV === 'production') {
      await runMiddleware(req, res, authMiddleware);
      await runMiddleware(req, res, requireRole(['admin']));
    }

    // Initialize database tables
    await initializeTables();
    
    // Seed with default data
    await seedDefaultData();
    
    res.status(200).json({ 
      message: 'Database initialized successfully',
      note: 'Default admin credentials have been created with secure passwords'
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize database'
    });
  }
}