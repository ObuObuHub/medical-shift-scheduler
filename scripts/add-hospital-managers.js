// Script to add the two hospital manager accounts to the database
// This will create the users with their specific passwords and hospital assignments

const { sql } = require('../lib/vercel-db.js');

async function addHospitalManagers() {
  try {
    console.log('Adding hospital manager accounts...\n');
    
    // These are the secure versions of the passwords we just created
    const manager1Hash = '$2b$10$ZALMd3Rn.PnRjO9ih8UQr.6CJqq37IK2rkufJCJIXNaZSzxoYXGr.';
    const manager2Hash = '$2b$10$dQtCt7JUty2Fns9SdMQQiu6bymrvdq2IK4viax76Mox1tNAPJzgyG';
    
    // Check if manager.spital1 already exists
    const existing1 = await sql`
      SELECT id FROM users WHERE username = 'manager.spital1'
    `;
    
    if (existing1.length === 0) {
      // Add manager for Hospital 1 (Piatra-Neamț)
      await sql`
        INSERT INTO users (name, username, password_hash, role, hospital, type, is_active)
        VALUES (
          'Manager Spitalul Județean de Urgență Piatra-Neamț',
          'manager.spital1',
          ${manager1Hash},
          'manager',
          'spital1',
          'medic',
          true
        )
      `;
      console.log('✓ Created manager.spital1 for Spitalul Județean de Urgență Piatra-Neamț');
    } else {
      console.log('ℹ manager.spital1 already exists');
    }
    
    // Check if manager.spital2 already exists
    const existing2 = await sql`
      SELECT id FROM users WHERE username = 'manager.spital2'
    `;
    
    if (existing2.length === 0) {
      // Add manager for Hospital 2 (Buhuși)
      await sql`
        INSERT INTO users (name, username, password_hash, role, hospital, type, is_active)
        VALUES (
          'Manager Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
          'manager.spital2',
          ${manager2Hash},
          'manager',
          'spital2',
          'medic',
          true
        )
      `;
      console.log('✓ Created manager.spital2 for Spitalul "Prof. Dr. Eduard Apetrei" Buhuși');
    } else {
      console.log('ℹ manager.spital2 already exists');
    }
    
    console.log('\n========== LOGIN INFORMATION ==========');
    console.log('Hospital 1 - Piatra-Neamț:');
    console.log('  Username: manager.spital1');
    console.log('  Password: SP1a4');
    console.log('');
    console.log('Hospital 2 - Buhuși:');
    console.log('  Username: manager.spital2');
    console.log('  Password: BH2x9');
    console.log('======================================\n');
    
    console.log('✓ Manager accounts are ready to use!');
    console.log('✓ Each manager can only see and manage their own hospital.');
    
  } catch (error) {
    console.error('❌ Error adding managers:', error.message);
    process.exit(1);
  }
}

// Run the script
addHospitalManagers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });