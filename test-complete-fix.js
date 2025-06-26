// Complete test for shift generation fixes
// Run this in browser console after logging in as admin

async function testCompleteFix() {
  console.log('=== Testing Complete Shift Generation Fix ===');
  
  const token = localStorage.getItem('authToken');
  if (!token || localStorage.getItem('userRole') !== 'admin') {
    console.error('❌ Please login as admin first!');
    return;
  }
  
  console.log('✅ Logged in as admin');
  
  // 1. Setup hospital configurations
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
      console.log('✅ Hospital configs setup:', result);
    }
  } catch (error) {
    console.error('Setup error:', error);
  }
  
  // 2. Test Calendar View vs Matrix View
  console.log('\n2️⃣ Testing Calendar View vs Matrix View Consistency:');
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Go to "Planificare" and select Calendar View (calendar icon)');
  console.log('2. Select "Spitalul Județean de Urgență Piatra-Neamț"');
  console.log('3. Navigate to January 2025');
  console.log('4. Click "Genereaza" button to generate shifts');
  console.log('5. Note the pattern:');
  console.log('   - Weekdays: Only purple night shifts');
  console.log('   - Jan 11 & 18: Green 24h shifts');
  console.log('   - Other weekends: Blue day + purple night');
  console.log('');
  console.log('6. Switch to Matrix View (grid icon)');
  console.log('7. Click "Generare" or "Regenerare" button');
  console.log('8. ✅ VERIFY: The pattern should be IDENTICAL to Calendar View!');
  console.log('');
  console.log('9. Repeat for "Spitalul Prof. Dr. Eduard Apetrei Buhuși"');
  console.log('   - Should show ONLY green 24h shifts in BOTH views');
  
  // 3. Test staff constraints
  console.log('\n3️⃣ Testing Staff Constraints:');
  console.log('');
  console.log('📋 To test unavailable dates:');
  console.log('1. Go to "Personal" tab');
  console.log('2. Click on a staff member to edit');
  console.log('3. Set some unavailable dates in January 2025');
  console.log('4. Save and go back to "Planificare"');
  console.log('5. Regenerate shifts');
  console.log('6. ✅ VERIFY: That staff member has NO shifts on unavailable dates');
  console.log('');
  console.log('📋 To test max guards per month:');
  console.log('1. Edit a staff member and set "Numărul maxim de garzi" to 5');
  console.log('2. Save and regenerate shifts');
  console.log('3. ✅ VERIFY: That staff member has maximum 5 shifts in the month');
  
  // 4. Check current staff data
  console.log('\n4️⃣ Current Staff Data Check:');
  try {
    const staffResponse = await fetch('/api/staff', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log(`Total staff: ${staff.length}`);
      
      // Show first 3 staff members with their constraints
      staff.slice(0, 3).forEach(s => {
        console.log(`- ${s.name}: maxGuards=${s.maxGuardsPerMonth}, unavailable=${s.unavailable?.length || 0} days`);
      });
    }
  } catch (error) {
    console.error('Staff check error:', error);
  }
  
  console.log('\n✅ Test setup complete! Follow the instructions above to verify the fixes.');
}

// Run the test
testCompleteFix();