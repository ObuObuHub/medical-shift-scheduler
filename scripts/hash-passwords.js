// This script helps create secure passwords for the new manager accounts
// It takes the plain passwords and converts them to a secure format

const bcrypt = require('bcryptjs');

async function hashPasswords() {
  console.log('Creating secure passwords for manager accounts...\n');
  
  // Password for manager.spital1
  const password1 = 'SP1a4';
  const hash1 = await bcrypt.hash(password1, 10);
  console.log('Manager Spital 1:');
  console.log('  Username: manager.spital1');
  console.log('  Password: SP1a4');
  console.log('  Secure hash:', hash1);
  console.log('');
  
  // Password for manager.spital2
  const password2 = 'BH2x9';
  const hash2 = await bcrypt.hash(password2, 10);
  console.log('Manager Spital 2:');
  console.log('  Username: manager.spital2');
  console.log('  Password: BH2x9');
  console.log('  Secure hash:', hash2);
}

hashPasswords().catch(console.error);