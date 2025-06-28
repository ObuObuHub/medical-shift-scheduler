import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';
import { authMiddleware, runMiddleware } from '../../../lib/auth';
import { validatePassword, isCommonPassword } from '../../../lib/passwordValidator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require authentication
    await runMiddleware(req, res, authMiddleware);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Parola nouă nu îndeplinește cerințele de securitate',
        details: passwordValidation.errors
      });
    }

    // Check for common weak passwords
    if (isCommonPassword(newPassword)) {
      return res.status(400).json({ 
        error: 'Parola este prea comună. Vă rugăm alegeți o parolă mai sigură.' 
      });
    }

    // Get current user's password hash
    const userResult = await sql`
      SELECT password_hash FROM users 
      WHERE id = ${req.user.id} AND is_active = true;
    `;

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Parola curentă este incorectă' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sql`
      UPDATE users 
      SET password_hash = ${hashedPassword}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${req.user.id};
    `;

    res.status(200).json({ 
      message: 'Parola a fost schimbată cu succes',
      passwordStrength: passwordValidation.strength 
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}