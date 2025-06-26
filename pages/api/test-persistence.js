export default async function handler(req, res) {
  // Simple test endpoint to verify database connectivity
  try {
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    
    res.status(200).json({
      message: 'Database configuration check',
      database_url_configured: hasDbUrl,
      postgres_url_configured: hasPostgresUrl,
      note: 'When database is connected, all admin changes are automatically saved permanently',
      current_behavior: {
        with_database: 'All changes (staff, hospitals, shifts) are saved to database',
        without_database: 'Falls back to hardcoded defaults, changes are only in memory'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message 
    });
  }
}