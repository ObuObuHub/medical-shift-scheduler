// Login helper for browser console
// Copy and paste this into the browser console on medical-shift-scheduler.vercel.app

async function loginAsAdmin() {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!response.ok) {
      console.error('Login failed:', response.status);
      const error = await response.text();
      console.error('Error:', error);
      return;
    }
    
    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('username', data.user.username);
    
    console.log('✅ Logged in successfully as admin!');
    console.log('User:', data.user);
    
    // Refresh the page to apply the login
    setTimeout(() => {
      console.log('Refreshing page...');
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Check current login status
function checkLoginStatus() {
  const token = localStorage.getItem('authToken');
  const role = localStorage.getItem('userRole');
  const username = localStorage.getItem('username');
  
  if (token) {
    console.log('✅ Currently logged in as:', username, '- Role:', role);
  } else {
    console.log('❌ Not logged in');
  }
}

// Run the check
checkLoginStatus();

// To login, run:
// loginAsAdmin()