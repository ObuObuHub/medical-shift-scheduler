// Direct script to create manager accounts in the database
// This script connects directly to the database and creates the accounts

import { sql } from '../lib/vercel-db.js';
import bcrypt from 'bcryptjs';

async function createManagers() {
  try {
    console.log('Creating manager accounts...\n');
    
    // Create manager.spital1
    const manager1Exists = await sql`
      SELECT id FROM users WHERE username = 'manager.spital1'
    `;
    
    if (manager1Exists.length === 0) {
      const hash1 = await bcrypt.hash('SP1a4', 10);
      await sql`
        INSERT INTO users (
          name, username, password_hash, role, hospital, type, is_active
        ) VALUES (
          'Manager Spitalul Județean de Urgență Piatra-Neamț',
          'manager.spital1',
          ${hash1},
          'manager',
          'spital1',
          'medic',
          true
        )
      `;
      console.log('✓ Created manager.spital1');
    } else {
      console.log('ℹ manager.spital1 already exists');
    }
    
    // Create manager.spital2
    const manager2Exists = await sql`
      SELECT id FROM users WHERE username = 'manager.spital2'
    `;
    
    if (manager2Exists.length === 0) {
      const hash2 = await bcrypt.hash('BH2x9', 10);
      await sql`
        INSERT INTO users (
          name, username, password_hash, role, hospital, type, is_active
        ) VALUES (
          'Manager Spitalul Prof. Dr. Eduard Apetrei Buhuși',
          'manager.spital2',
          ${hash2},
          'manager',
          'spital2',
          'medic',
          true
        )
      `;
      console.log('✓ Created manager.spital2');
    } else {
      console.log('ℹ manager.spital2 already exists');
    }
    
    console.log('\n✓ Manager accounts are ready!');
    console.log('\nLogin credentials:');
    console.log('  Hospital 1: manager.spital1 / SP1a4');
    console.log('  Hospital 2: manager.spital2 / BH2x9');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

createManagers();