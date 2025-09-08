// Database Connection and Configuration for ASH AI

import { PrismaClient } from '@prisma/client';

declare global {
   
  var prisma: PrismaClient | undefined;
}

export const db =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.ASH_DATABASE_URL,
      },
    },
  });

export const prisma = db;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

// Database Health Check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (_error) {
    console.error('Database health check failed:', _error);
    return false;
  }
}

// Transaction wrapper with retry logic
export async function withTransaction<T>(
  operation: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.$transaction(operation, {
        timeout: 30000, // 30 seconds
      });
    } catch (error: unknown) {
      console.error(`Transaction attempt ${attempt} failed:`, error);
      
      // Don't retry on certain errors
      if (
        error instanceof Error && 'code' in error &&
        (error.code === 'P2002' || // Unique constraint violation
         error.code === 'P2025')   // Record not found
      ) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Transaction failed after ${maxRetries} attempts: ${message}`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Transaction failed unexpectedly');
}

// Audit logging helper
export async function createAuditLog(params: {
  workspace_id: string;
  actor_id?: string;
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPLY_TEMPLATE' | 'CUSTOMIZE_ROUTING' | 'STATUS_CHANGE' | 'APPROVE' | 'REJECT';
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        workspace_id: params.workspace_id,
        actor_id: params.actor_id,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        action: params.action,
        before_data: params.before_data ? JSON.stringify(params.before_data) : undefined,
        after_data: params.after_data ? JSON.stringify(params.after_data) : undefined,
      },
    });
  } catch (_error) {
    console.error('Failed to create audit log:', _error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}