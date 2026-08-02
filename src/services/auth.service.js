import bcrypt from 'bcrypt';
import { findUserByEmail } from './user.service.js';
import { createSession } from './session.service.js';
import { createRefreshToken } from './refreshToken.service.js';
import { generateAccessToken, generateRefreshToken } from './token.service.js';

export const loginUser = async (email, password, req, client) => {
  // 1. Find user
  const user = await findUserByEmail(email, client);
  if (!user) {
    const error = new Error('Credenciales inválidas');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // 2. Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Credenciales inválidas');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // 3. Create session
  const session = await createSession(user.id, req, client);

  // 4. Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();

  // 5. Save refresh token
  await createRefreshToken(session.id, refreshToken, client);

  // 6. Return data
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    },
    session: {
      id: session.id
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
};