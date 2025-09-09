import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { TwoFactorAuth } from '@/lib/auth/two-factor';
import { authOptions } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const setupData = await TwoFactorAuth.generateSecret(
      session.user.id,
      session.user.email!
    );

    return NextResponse.json({
      success: true,
      data: setupData
    });

  } catch (_error) {
    console.error('2FA setup error:', _error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}