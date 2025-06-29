// Simple script to create manager accounts using the API
// You need to be logged in as admin first

const managers = [
  {
    name: 'Manager Spitalul Județean de Urgență Piatra-Neamț',
    username: 'manager.spital1',
    password: 'SP1a4',
    role: 'manager',
    hospital: 'spital1',
    type: 'medic'
  },
  {
    name: 'Manager Spitalul Prof. Dr. Eduard Apetrei Buhuși',
    username: 'manager.spital2',
    password: 'BH2x9',
    role: 'manager',
    hospital: 'spital2',
    type: 'medic'
  }
];

console.log('To create the manager accounts:');
console.log('');
console.log('1. First, log in to your application as admin (username: admin, password: admin123)');
console.log('');
console.log('2. Open your browser\'s Developer Tools (press F12)');
console.log('');
console.log('3. Go to the Console tab');
console.log('');
console.log('4. Copy and paste this code for each manager:');
console.log('');

managers.forEach((manager, index) => {
  console.log(`// Manager ${index + 1} - ${manager.hospital}`);
  console.log(`fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  },
  body: JSON.stringify(${JSON.stringify(manager, null, 2)})
})
.then(res => res.json())
.then(data => console.log('Created:', data))
.catch(err => console.error('Error:', err));`);
  console.log('');
});

console.log('After running these commands, you\'ll have:');
console.log('  • manager.spital1 (password: SP1a4) - can only manage spital1');
console.log('  • manager.spital2 (password: BH2x9) - can only manage spital2');