import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken, verifyLegacyPassword } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // First try to find user in database
    let user = await User.findOne({ username: username.toLowerCase() });

    // If user doesn't exist, check against legacy hardcoded users
    if (!user) {
      const legacyUsers = [
        { 
          username: 'admin', 
          passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
          name: 'Administrator',
          role: 'admin',
          hospital: 'spital1',
          type: 'medic'
        },
        { 
          username: 'manager', 
          passwordHash: '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5',
          name: 'Manager',
          role: 'manager',
          hospital: 'spital1',
          type: 'medic'
        }
      ];

      const legacyUser = legacyUsers.find(u => u.username === username.toLowerCase());
      
      if (legacyUser && verifyLegacyPassword(password, legacyUser.passwordHash)) {
        // Migrate legacy user to database
        user = new User({
          name: legacyUser.name,
          username: legacyUser.username,
          passwordHash: password, // Will be hashed by pre-save hook
          role: legacyUser.role,
          hospital: legacyUser.hospital,
          type: legacyUser.type
        });
        await user.save();
        
        // Reload user to get hashed password
        user = await User.findOne({ username: username.toLowerCase() });
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        hospital: user.hospital,
        type: user.type,
        specialization: user.specialization
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}