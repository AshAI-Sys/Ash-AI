import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client';
import { BackupManager } from '@/lib/backup/backup-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { type, destination, retention } = await request.json();

    if (!type || !['DATABASE', 'FILES', 'FULL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid backup type' },
        { status: 400 }
      );
    }

    const config = {
      type,
      destination: destination || 'local',
      retention: retention || 30
    };

    const backupPath = await BackupManager.createBackup(config);

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      backupPath
    });

  } catch (_error) {
    console.error('Backup creation error:', _error);
    return NextResponse.json(
      { error: 'Backup creation failed' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { prisma } = await import('@/lib/prisma');
    
    const backups = await prisma.backupJob.findMany({
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return NextResponse.json({
      success: true,
      backups
    });

  } catch (_error) {
    console.error('Backup list error:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}