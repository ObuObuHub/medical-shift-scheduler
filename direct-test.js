// Direct test using the app's existing functionality
// Run this in the browser console while on the app

async function directTest() {
  console.log('=== Direct Shift Generation Test ===');
  
  // Check if logged in
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'admin') {
    console.error('❌ Please login as admin first!');
    return;
  }
  
  console.log('✅ Logged in as admin');
  
  // First, setup hospital configs
  console.log('\n1️⃣ Setting up hospital configurations...');
  try {
    const response = await fetch('/api/db/setup-hospital-configs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer medical-scheduler-secret-key-change-in-production',
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Setup result:', result);
  } catch (error) {
    console.error('Setup error:', error);
  }
  
  console.log('\n2️⃣ To generate shifts:');
  console.log('   1. Go to "Planificare" from the main menu');
  console.log('   2. Select "Spitalul Județean de Urgență Piatra-Neamț"');
  console.log('   3. Click "Generează Program" button');
  console.log('   4. Check that weekdays have only night shifts');
  console.log('   5. Check that 2nd & 3rd Saturdays have 24h shifts');
  console.log('');
  console.log('   Then repeat for "Spitalul Prof. Dr. Eduard Apetrei Buhuși"');
  console.log('   - This hospital should have ONLY 24h shifts every day');
  
  // Let's also check current configs
  console.log('\n3️⃣ Checking current hospital configurations...');
  
  const hospitals = ['spital1', 'spital2'];
  for (const hospitalId of hospitals) {
    try {
      const response = await fetch(`/api/hospitals/${hospitalId}/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const config = await response.json();
        console.log(`\n${hospitalId} configuration:`, {
          pattern: config.shift_pattern,
          weekdayShifts: config.weekday_shifts,
          weekendShifts: config.weekend_shifts
        });
      }
    } catch (error) {
      console.error(`Error loading ${hospitalId} config:`, error);
    }
  }
}

directTest();