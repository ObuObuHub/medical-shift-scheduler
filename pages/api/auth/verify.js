import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Return user info from the token
    res.status(200).json({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      hospital: decoded.hospital
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}