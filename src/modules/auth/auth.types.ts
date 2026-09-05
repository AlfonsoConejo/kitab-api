export interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash?: string;
  created_at: Date | string;
  updated_at: Date | string | null;
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  createdAt: Date | string;
  updatedAt: Date | string | null;
}

export interface SessionMetadata {
  userAgent: string | undefined;
  ipAddress: string | undefined;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface RefreshTokenRow {
  id: number;
  session_id: number;
  is_used: boolean;
  is_revoked: boolean;
  expires_at: Date | string;
  user_id: number;
  is_active: boolean;
}
