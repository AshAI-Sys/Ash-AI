// @ts-nocheck
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  backupCodeUsed?: boolean;
}

export class TwoFactorAuth {
  
  static async generateSecret(user_id: string, userEmail: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `Sorbetes Apparel (${userEmail})`,
      issuer: 'Sorbetes Apparel Studio',
      length: 32
    });

    const backupCodes = this.generateBackupCodes();
    
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    await prisma.twoFactorAuth.upsert({
      where: { user_id },
      create: {
        user_id,
        secret: secret.base32!,
        enabled: false,
        backupCodes: backupCodes,
      },
      update: {
        secret: secret.base32!,
        backupCodes: backupCodes,
      }
    });

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes
    };
  }

  static async enableTwoFactor(user_id: string, token: string): Promise<boolean> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { user_id }
    });

    if (!twoFactorAuth) {
      throw new Error('2FA not set up');
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      token,
      window: 2
    });

    if (isValid) {
      await prisma.twoFactorAuth.update({
        where: { user_id },
        data: { enabled: true }
      });
    }

    return isValid;
  }

  static async disableTwoFactor(user_id: string): Promise<void> {
    await prisma.twoFactorAuth.update({
      where: { user_id },
      data: { enabled: false }
    });
  }

  static async verifyToken(user_id: string, token: string): Promise<TwoFactorVerification> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { user_id }
    });

    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      return { isValid: false };
    }

    const isValidTotp = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      token,
      window: 2
    });

    if (isValidTotp) {
      await prisma.twoFactorAuth.update({
        where: { user_id },
        data: { lastUsed: new Date() }
      });
      return { isValid: true };
    }

    const backupCodes = twoFactorAuth.backupCodes as string[];
    const isBackupCode = backupCodes.includes(token.toUpperCase());

    if (isBackupCode) {
      const updatedBackupCodes = backupCodes.filter(code => code !== token.toUpperCase());
      await prisma.twoFactorAuth.update({
        where: { user_id },
        data: { 
          backupCodes: updatedBackupCodes,
          lastUsed: new Date()
        }
      });
      return { isValid: true, backupCodeUsed: true };
    }

    return { isValid: false };
  }

  static async isTwoFactorEnabled(user_id: string): Promise<boolean> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { user_id }
    });

    return twoFactorAuth?.enabled ?? false;
  }

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private static hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  static async regenerateBackupCodes(user_id: string): Promise<string[]> {
    const newCodes = this.generateBackupCodes();
    
    await prisma.twoFactorAuth.update({
      where: { user_id },
      data: { backupCodes: newCodes }
    });

    return newCodes;
  }
}