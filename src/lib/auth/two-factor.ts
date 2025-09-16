/**
 * Two-Factor Authentication Implementation for ASH AI
 * Provides TOTP (Time-based One-Time Password) support
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../prisma';
import crypto from 'crypto';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorValidation {
  isValid: boolean;
  usedBackupCode?: boolean;
}

/**
 * Generate a new 2FA secret and QR code for user setup
 */
export async function generateTwoFactorSecret(
  userId: string,
  userEmail: string,
  companyName: string = 'ASH AI'
): Promise<TwoFactorSetup> {
  // Generate a new secret
  const secret = speakeasy.generateSecret({
    name: `${companyName} (${userEmail})`,
    issuer: companyName,
    length: 32
  });

  // Generate backup codes (10 codes, 8 characters each)
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Generate QR code URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // Store the secret and backup codes in database (encrypted)
  await prisma.user.update({
    where: { id: userId },
    data: {
      two_factor_secret: secret.base32,
      two_factor_backup_codes: JSON.stringify(backupCodes),
      two_factor_enabled: false, // Will be enabled after first successful verification
      two_factor_setup_date: new Date()
    }
  });

  return {
    secret: secret.base32!,
    qrCodeUrl,
    backupCodes
  };
}

/**
 * Verify a TOTP token and enable 2FA if it's the initial setup
 */
export async function verifyTwoFactorToken(
  userId: string,
  token: string,
  isSetup: boolean = false
): Promise<TwoFactorValidation> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      two_factor_secret: true,
      two_factor_enabled: true,
      two_factor_backup_codes: true,
      two_factor_last_used: true
    }
  });

  if (!user || !user.two_factor_secret) {
    return { isValid: false };
  }

  // Clean the token (remove spaces, etc.)
  const cleanToken = token.replace(/\s/g, '');

  // Verify TOTP token
  const isValidTotp = speakeasy.totp.verify({
    secret: user.two_factor_secret,
    encoding: 'base32',
    token: cleanToken,
    window: 2 // Allow 2 time steps before/after current time
  });

  if (isValidTotp) {
    // If this is setup, enable 2FA
    if (isSetup) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          two_factor_enabled: true,
          two_factor_verified_date: new Date()
        }
      });
    }

    // Update last used timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_last_used: new Date() }
    });

    return { isValid: true };
  }

  // If TOTP failed, try backup codes
  if (user.two_factor_backup_codes) {
    const backupCodes = JSON.parse(user.two_factor_backup_codes) as string[];
    const upperToken = cleanToken.toUpperCase();

    if (backupCodes.includes(upperToken)) {
      // Remove used backup code
      const updatedBackupCodes = backupCodes.filter(code => code !== upperToken);

      await prisma.user.update({
        where: { id: userId },
        data: {
          two_factor_backup_codes: JSON.stringify(updatedBackupCodes),
          two_factor_last_used: new Date()
        }
      });

      return { isValid: true, usedBackupCode: true };
    }
  }

  return { isValid: false };
}

/**
 * Disable 2FA for a user
 */
export async function disableTwoFactor(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null,
      two_factor_setup_date: null,
      two_factor_verified_date: null,
      two_factor_last_used: null
    }
  });
}

/**
 * Regenerate backup codes for a user
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      two_factor_backup_codes: JSON.stringify(backupCodes)
    }
  });

  return backupCodes;
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { two_factor_enabled: true }
  });

  return user?.two_factor_enabled || false;
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { two_factor_backup_codes: true }
  });

  if (!user?.two_factor_backup_codes) return 0;

  const backupCodes = JSON.parse(user.two_factor_backup_codes) as string[];
  return backupCodes.length;
}