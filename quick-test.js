// Quick test for shift generation
// Make sure you're logged in as admin first!

async function quickTest() {
  console.log('=== Quick Shift Generation Test ===');
  
  const authToken = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('username');
  
  if (!authToken) {
    console.error('❌ Not logged in! Please login first.');
    return;
  }
  
  console.log('✅ Logged in as:', username, '- Role:', userRole);
  
  if (userRole !== 'admin') {
    console.error('❌ You must be logged in as ADMIN!');
    return;
  }
  
  // First setup hospital configs
  console.log('\n1️⃣ Setting up hospital configurations...');
  try {
    const setupResponse = await fetch('/api/db/setup-hospital-configs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer medical-scheduler-secret-key-change-in-production',
        'Content-Type': 'application/json'
      }
    });
    
    if (setupResponse.ok) {
      const result = await setupResponse.json();
      console.log('✅ Configs setup:', result);
    } else {
      console.log('⚠️ Config setup returned:', setupResponse.status);
    }
  } catch (error) {
    console.error('⚠️ Config setup error:', error);
  }
  
  // Test Spitalul Județean (spital1)
  console.log('\n2️⃣ Testing Spitalul Județean (complex pattern)...');
  try {
    // Generate for January 2025
    const response = await fetch('/api/generate-schedule', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hospitalId: 'spital1',
        month: 0, // January
        year: 2025
      })
    });
    
    if (response.ok) {
      console.log('✅ Generated shifts for Spitalul Județean');
      
      // Check a few specific dates
      console.log('\nChecking pattern for Spitalul Județean:');
      console.log('- Jan 6 (Monday) - should have ONLY night shift');
      console.log('- Jan 11 (Saturday, week 2) - should have 24h shift');
      console.log('- Jan 18 (Saturday, week 3) - should have 24h shift');
      console.log('- Jan 25 (Saturday, week 4) - should have day + night shifts');
      
    } else {
      console.error('❌ Failed to generate:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Test Spitalul Apetrei (spital2)
  console.log('\n3️⃣ Testing Spitalul Apetrei (24h only)...');
  try {
    const response = await fetch('/api/generate-schedule', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hospitalId: 'spital2',
        month: 0, // January
        year: 2025
      })
    });
    
    if (response.ok) {
      console.log('✅ Generated shifts for Spitalul Apetrei');
      console.log('\nPattern: Should have ONLY 24h shifts every day');
    } else {
      console.error('❌ Failed to generate:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n✅ Test complete! Go to Planificare to see the generated shifts.');
  console.log('📍 Check that:');
  console.log('   - Spitalul Județean: Weekdays have night shifts, special Saturdays have 24h');
  console.log('   - Spitalul Apetrei: Only 24h shifts every day');
}

// Run the test
quickTest();