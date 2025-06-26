// Setup hospital configurations in the browser console
// Copy and paste this into your browser console while on the medical-shift-scheduler.vercel.app site

async function setupHospitalConfigs() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('Please login first!');
    return;
  }

  try {
    const response = await fetch('/api/db/setup-hospital-configs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.JWT_SECRET || 'medical-scheduler-secret-key-change-in-production'}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Setup Result:', result);
    return result;
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

// Run the setup
setupHospitalConfigs();