import { initializeTables, seedDefaultData } from '../../../lib/vercel-db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database tables
    await initializeTables();
    
    // Seed with default data
    await seedDefaultData();
    
    res.status(200).json({ 
      message: 'Database initialized successfully',
      credentials: {
        admin: { username: 'admin', password: 'admin123' },
        manager: { username: 'manager', password: 'manager123' }
      }
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize database',
      details: error.message 
    });
  }
}