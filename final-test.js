// Final test script for shift generation
// Run this in browser console after logging in as admin

async function finalTest() {
  console.log('=== Testing Shift Generation ===');
  
  // 1. Setup hospital configurations
  console.log('1️⃣ Setting up hospital configurations...');
  const setupResponse = await fetch('/api/db/setup-hospital-configs', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer medical-scheduler-secret-key-change-in-production',
      'Content-Type': 'application/json'
    }
  });
  
  if (setupResponse.ok) {
    const result = await setupResponse.json();
    console.log('✅ Hospital configs setup:', result);
  } else {
    console.error('❌ Failed to setup configs:', setupResponse.status);
  }
  
  console.log('\n2️⃣ Instructions to test shift generation:');
  console.log('');
  console.log('📍 For Spitalul Județean (complex pattern):');
  console.log('   1. Go to "Planificare" from the menu');
  console.log('   2. Select "Spitalul Județean de Urgență Piatra-Neamț"');
  console.log('   3. Navigate to January 2025 using the arrows');
  console.log('   4. Click the "Genereaza" button (green button with wand icon)');
  console.log('');
  console.log('   ✓ Check that Mon-Fri have ONLY purple night shifts (20:00-08:00)');
  console.log('   ✓ Check that 2nd Saturday (Jan 11) has a green 24h shift');
  console.log('   ✓ Check that 3rd Saturday (Jan 18) has a green 24h shift');
  console.log('   ✓ Check that other weekends have blue day + purple night shifts');
  console.log('');
  console.log('📍 For Spitalul Apetrei (24h only):');
  console.log('   1. Switch to "Spitalul Prof. Dr. Eduard Apetrei Buhuși"');
  console.log('   2. Click the "Genereaza" button');
  console.log('');
  console.log('   ✓ Check that EVERY day has ONLY green 24h shifts');
  console.log('   ✓ There should be NO blue day shifts or purple night shifts');
  
  // Check current configs
  console.log('\n3️⃣ Current hospital configurations:');
  
  const token = localStorage.getItem('authToken');
  if (token) {
    for (const hospitalId of ['spital1', 'spital2']) {
      try {
        const response = await fetch(`/api/hospitals/${hospitalId}/config`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const config = await response.json();
          const name = hospitalId === 'spital1' ? 'Spitalul Județean' : 'Spitalul Apetrei';
          console.log(`\n${name}:`, {
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
  
  console.log('\n✅ Setup complete! Follow the instructions above to test.');
}

// Run the test
finalTest();