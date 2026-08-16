// ── Authentication domain types ──────────────────────────────────────────

export type UserRole = 'admin' | 'customer';

export type CustomerStatus = 
  | 'registered' 
  | 'akv_customer' 
  | 'non_akv' 
  | 'active' 
  | 'inactive' 
  | 'blocked';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  status?: CustomerStatus;
  profile_photo?: string | null;
  last_login?: string | null;
  akv_customer_id?: number | null;
  customer_status?: CustomerStatus;
  is_akv_customer?: boolean;
}

export interface LoginResponse {
  success: true;
  token: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
