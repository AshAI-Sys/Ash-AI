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
  
  static async generateSecret(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `Sorbetes Apparel (${userEmail})`,
      issuer: 'Sorbetes Apparel Studio',
      length: 32
    });

    const backupCodes = this.generateBackupCodes();
    
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    await prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
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

  static async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId }
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
        where: { userId },
        data: { enabled: true }
      });
    }

    return isValid;
  }

  static async disableTwoFactor(userId: string): Promise<void> {
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: false }
    });
  }

  static async verifyToken(userId: string, token: string): Promise<TwoFactorVerification> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId }
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
        where: { userId },
        data: { lastUsed: new Date() }
      });
      return { isValid: true };
    }

    const backupCodes = twoFactorAuth.backupCodes as string[];
    const isBackupCode = backupCodes.includes(token.toUpperCase());

    if (isBackupCode) {
      const updatedBackupCodes = backupCodes.filter(code => code !== token.toUpperCase());
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { 
          backupCodes: updatedBackupCodes,
          lastUsed: new Date()
        }
      });
      return { isValid: true, backupCodeUsed: true };
    }

    return { isValid: false };
  }

  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId }
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

  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const newCodes = this.generateBackupCodes();
    
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: newCodes }
    });

    return newCodes;
  }
}