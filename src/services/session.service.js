import { getLocationFromIp } from '../utils/geo.js';

export const createSession = async (userId, req, client) => {
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip || req.connection?.remoteAddress;
  
  // Get location from IP address
  let location = {};
  try {
    location = await getLocationFromIp(ipAddress);
  } catch (error) {
    console.warn('No se pudo obtener ubicación:', error.message);
    location = { city: null, state: null, country: null };
  }

  const result = await client.query(
    `INSERT INTO sessions (
      user_id, user_agent, ip_address, city, state, country
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at`,
    [
      userId,
      userAgent,
      ipAddress,
      location.city || null,
      location.state || null,
      location.country || null
    ]
  );

  return result.rows[0];
};