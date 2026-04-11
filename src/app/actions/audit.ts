'use server';
import { logAudit, type LogAuditParams } from '@/lib/audit';

export async function auditAction(params: LogAuditParams): Promise<void> {
  logAudit(params);
}
