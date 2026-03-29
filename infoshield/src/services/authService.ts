/**
 * authService.ts — Session management utilities
 * Separated from Auth.tsx to comply with react-refresh/only-export-components
 */

export interface Session {
  email: string;
  name: string;
  loggedIn: boolean;
  verified?: boolean;
}

export function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem('infoshield_session') ?? 'null') as Session | null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem('infoshield_session');
}
