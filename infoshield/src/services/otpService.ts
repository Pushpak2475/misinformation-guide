/**
 * otpService.ts — OTP generation and verification helpers
 * Separated from VerifyEmail.tsx to comply with react-refresh/only-export-components
 */

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createVerification(email: string): string {
  const otp = generateOTP();
  const expiry = Date.now() + 5 * 60 * 1000; // 5 min TTL
  localStorage.setItem(
    `infoshield_otp_${email}`,
    JSON.stringify({ otp, expiry, verified: false })
  );
  return otp;
}

export function isVerified(email: string): boolean {
  try {
    const raw = localStorage.getItem(`infoshield_otp_${email}`);
    if (!raw) return false;
    return JSON.parse(raw).verified === true;
  } catch {
    return false;
  }
}

export function validateOTP(email: string, inputOtp: string): 'valid' | 'expired' | 'invalid' {
  try {
    const raw = localStorage.getItem(`infoshield_otp_${email}`);
    if (!raw) return 'invalid';
    const { otp, expiry } = JSON.parse(raw) as { otp: string; expiry: number };
    if (Date.now() > expiry) return 'expired';
    if (otp === inputOtp) return 'valid';
    return 'invalid';
  } catch {
    return 'invalid';
  }
}

export function markVerified(email: string): void {
  try {
    const raw = localStorage.getItem(`infoshield_otp_${email}`);
    if (!raw) return;
    const data = JSON.parse(raw) as { otp: string; expiry: number; verified: boolean };
    data.verified = true;
    localStorage.setItem(`infoshield_otp_${email}`, JSON.stringify(data));
    const session = JSON.parse(localStorage.getItem('infoshield_session') ?? 'null') as Record<string, unknown> | null;
    if (session) {
      session.verified = true;
      localStorage.setItem('infoshield_session', JSON.stringify(session));
    }
  } catch { /* noop */ }
}
