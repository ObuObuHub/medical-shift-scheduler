import { sql } from '../../lib/vercel-db';
import { authMiddleware, runMiddleware } from '../../lib/auth';

export default async function handler(req, res) {
  try {
    // Authentication check
    await runMiddleware(req, res, authMiddleware);

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const tests = {
      database: false,
      shifts: false,
      staff: false,
      hospitals: false,
      deleteShift: false
    };

    // Test 1: Database connection
    try {
      const result = await sql`SELECT 1 as test`;
      tests.database = result.length > 0;
    } catch (error) {
      console.error('Database test failed:', error);
    }

    // Test 2: Read shifts
    try {
      const shifts = await sql`
        SELECT COUNT(*) as count FROM shifts WHERE is_active = true
      `;
      tests.shifts = true;
      tests.shiftsCount = shifts[0].count;
    } catch (error) {
      console.error('Shifts test failed:', error);
    }

    // Test 3: Read staff
    try {
      const staff = await sql`
        SELECT COUNT(*) as count FROM staff WHERE is_active = true
      `;
      tests.staff = true;
      tests.staffCount = staff[0].count;
    } catch (error) {
      console.error('Staff test failed:', error);
    }

    // Test 4: Read hospitals
    try {
      const hospitals = await sql`
        SELECT COUNT(*) as count FROM hospitals WHERE is_active = true
      `;
      tests.hospitals = true;
      tests.hospitalsCount = hospitals[0].count;
    } catch (error) {
      console.error('Hospitals test failed:', error);
    }

    // Test 5: Test shift deletion (soft delete)
    try {
      // Create a test shift
      const testShift = await sql`
        INSERT INTO shifts (shift_id, date, shift_type, staff_ids, department, hospital, created_by)
        VALUES (
          ${'test-shift-' + Date.now()},
          ${new Date().toISOString().split('T')[0]},
          ${'{"id":"test","name":"Test Shift","start":"08:00","end":"20:00","color":"#3B82F6","duration":12}'},
          ${'[]'},
          ${'test'},
          ${'spital1'},
          ${req.user.id}
        )
        RETURNING shift_id
      `;

      if (testShift.length > 0) {
        // Now delete it
        const deleteResult = await sql`
          UPDATE shifts 
          SET is_active = false 
          WHERE shift_id = ${testShift[0].shift_id}
          RETURNING shift_id
        `;
        
        tests.deleteShift = deleteResult.length > 0;
      }
    } catch (error) {
      console.error('Delete shift test failed:', error);
    }

    // Return test results
    res.status(200).json({
      success: Object.values(tests).every(v => v === true),
      tests,
      message: 'Persistence test completed',
      user: req.user.username
    });

  } catch (error) {
    console.error('Test persistence error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}