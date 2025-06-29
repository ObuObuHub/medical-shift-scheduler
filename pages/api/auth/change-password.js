import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get user from database
    const userResult = await sql`
      SELECT id, password_hash FROM users 
      WHERE id = ${user.id} AND is_active = true;
    `;

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dbUser = userResult[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sql`
      UPDATE users 
      SET password_hash = ${hashedPassword}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id};
    `;

    res.status(200).json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}