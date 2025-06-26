import { generateDaysForMonth, generateSchedule, calculateFairQuotas } from '../../utils/shiftEngineV2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test configuration matching Spitalul Județean pattern
    const hospitalConfig = {
      hospital_id: 'spital1',
      shiftPattern: 'standard_12_24',
      shiftTypes: {
        'GARDA_ZI': {
          id: 'GARDA_ZI',
          name: 'Gardă Zi (8-20)',
          start: '08:00',
          end: '20:00',
          color: '#3B82F6',
          duration: 12
        },
        'NOAPTE': {
          id: 'NOAPTE',
          name: 'Gardă Noapte (20-8)',
          start: '20:00',
          end: '08:00',
          color: '#7C3AED',
          duration: 12
        },
        'GARDA_24': {
          id: 'GARDA_24',
          name: 'Gardă 24h (8-8)',
          start: '08:00',
          end: '08:00',
          color: '#10B981',
          duration: 24
        }
      },
      maxShiftsPerMonth: 10,
      maxConsecutiveNights: 2,
      rules: {
        allow_consecutive_weekends: true,
        min_rest_hours: 12
      }
    };

    // Test staff
    const testStaff = [
      { id: 1, name: 'Dr. Test 1', unavailable: [] },
      { id: 2, name: 'Dr. Test 2', unavailable: [] },
      { id: 3, name: 'Dr. Test 3', unavailable: [] }
    ];

    // Generate days for January 2025
    const testDate = new Date(2025, 0, 1); // January 2025
    const days = generateDaysForMonth(testDate, hospitalConfig);
    
    // Check pattern
    const patternCheck = {
      totalDays: days.length,
      weekdayNightOnlyCount: days.filter(d => 
        d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && 
        d.requiredShifts.length === 1 && 
        d.requiredShifts[0].id === 'NOAPTE'
      ).length,
      saturday24hCount: days.filter(d => 
        d.dayOfWeek === 6 && 
        d.requiredShifts.length === 1 && 
        d.requiredShifts[0].id === 'GARDA_24'
      ).length,
      sundayDayNightCount: days.filter(d => 
        d.dayOfWeek === 0 && 
        d.requiredShifts.length === 2
      ).length,
      detailsByDay: days.map(d => ({
        date: d.date,
        dayName: d.dayName,
        shifts: d.requiredShifts.map(s => s.id)
      }))
    };

    res.status(200).json({
      message: 'Shift generation test',
      hospitalConfig: {
        pattern: hospitalConfig.shiftPattern,
        shiftTypes: Object.keys(hospitalConfig.shiftTypes)
      },
      patternCheck,
      sampleDays: days.slice(0, 10) // First 10 days
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
}