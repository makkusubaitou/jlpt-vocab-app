import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple token generation (in production, use a more secure method)
function generateToken(): string {
  return crypto.randomUUID();
}

export async function createSession(): Promise<string> {
  const token = generateToken();
  const cookieStore = await cookies();
  
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME);
  return token?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

export function verifyPassword(password: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    console.error('APP_PASSWORD environment variable is not set');
    return false;
  }
  return password === appPassword;
}
