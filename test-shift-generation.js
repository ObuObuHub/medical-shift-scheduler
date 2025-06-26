// Test shift generation in browser console
// Run this after logging in as admin

async function testShiftGeneration() {
  console.log('=== Testing Shift Generation ===');
  
  // Test for both hospitals
  const hospitals = ['spital1', 'spital2'];
  const hospitalNames = {
    'spital1': 'Spitalul Județean de Urgență Piatra-Neamț',
    'spital2': 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși'
  };
  
  for (const hospitalId of hospitals) {
    console.log(`\n--- Testing ${hospitalNames[hospitalId]} ---`);
    
    try {
      // First, load the hospital config
      const configResponse = await fetch(`/api/hospitals/${hospitalId}/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!configResponse.ok) {
        console.error(`Failed to load config for ${hospitalId}:`, configResponse.status);
        continue;
      }
      
      const config = await configResponse.json();
      console.log(`Config loaded:`, config);
      
      // Clear existing shifts for January 2025
      console.log('Clearing January 2025 shifts...');
      const clearResponse = await fetch(`/api/shifts?action=clear-all&hospital=${hospitalId}&startDate=2025-01-01&endDate=2025-01-31`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!clearResponse.ok) {
        console.error('Failed to clear shifts:', clearResponse.status);
      }
      
      // Generate new shifts
      console.log('Generating new shifts for January 2025...');
      const generateResponse = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hospitalId: hospitalId,
          month: 0, // January
          year: 2025
        })
      });
      
      if (!generateResponse.ok) {
        console.error(`Failed to generate shifts for ${hospitalId}:`, generateResponse.status);
        const error = await generateResponse.text();
        console.error('Error:', error);
        continue;
      }
      
      const result = await generateResponse.json();
      console.log('Generation result:', result);
      
      // Check generated shifts
      const shiftsResponse = await fetch(`/api/shifts?hospital=${hospitalId}&startDate=2025-01-01&endDate=2025-01-31`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!shiftsResponse.ok) {
        console.error('Failed to load shifts:', shiftsResponse.status);
        continue;
      }
      
      const shifts = await shiftsResponse.json();
      console.log('Generated shifts count:', Object.keys(shifts).length);
      
      // Analyze shift patterns
      const shiftAnalysis = analyzeShifts(shifts, hospitalId);
      console.log('Shift analysis:', shiftAnalysis);
      
    } catch (error) {
      console.error(`Error testing ${hospitalId}:`, error);
    }
  }
}

function analyzeShifts(shifts, hospitalId) {
  const analysis = {
    totalDays: 0,
    shiftTypes: {},
    weekdayPattern: {},
    weekendPattern: {},
    saturdayAnalysis: []
  };
  
  Object.entries(shifts).forEach(([date, dayShifts]) => {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    analysis.totalDays++;
    
    dayShifts.forEach(shift => {
      // Count shift types
      const shiftType = shift.type?.id || 'unknown';
      analysis.shiftTypes[shiftType] = (analysis.shiftTypes[shiftType] || 0) + 1;
      
      // Track patterns
      const patternKey = isWeekday ? 'weekday' : 'weekend';
      const pattern = isWeekday ? analysis.weekdayPattern : analysis.weekendPattern;
      
      if (!pattern[dayName]) {
        pattern[dayName] = {};
      }
      pattern[dayName][shiftType] = (pattern[dayName][shiftType] || 0) + 1;
      
      // Special Saturday analysis for spital1
      if (hospitalId === 'spital1' && dayOfWeek === 6) {
        const weekOfMonth = Math.ceil(dateObj.getDate() / 7);
        analysis.saturdayAnalysis.push({
          date: date,
          week: weekOfMonth,
          shifts: dayShifts.map(s => s.type?.id || 'unknown')
        });
      }
    });
  });
  
  return analysis;
}

// Run the test
testShiftGeneration();