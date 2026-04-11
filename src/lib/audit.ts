import { rtdb } from './firebase';

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditSource = 'dashboard' | 'line_bot' | 'webhook' | 'api';
export type AuditEntityType =
  | 'expense' | 'advance' | 'lineUser' | 'user' | 'invite'
  | 'project' | 'costcenter' | 'owner' | 'apiPool' | 'signature';

export interface AuditActor {
  type: 'user' | 'lineUser' | 'system';
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface AuditEntity {
  type: AuditEntityType;
  id: string;
  path: string;
  label?: string;
}

export interface LogAuditParams {
  ownerId: string;
  actor: AuditActor;
  action: AuditAction;
  entity: AuditEntity;
  before?: Record<string, any>;
  after?: Record<string, any>;
  source?: AuditSource;
  metadata?: Record<string, any>;
}

const OMIT_FIELDS = new Set(['photoDataUri', 'imageBuffer', 'base64', 'rawImage']);
const MAX_STRING = 400;
const NOISE_FIELDS = new Set(['updatedAt', 'lastSeen', 'lastUpdated', 'lastModified']);

function sanitize(obj: any, depth = 0): any {
  if (obj === null || obj === undefined || typeof obj !== 'object' || depth > 4) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 20).map(i => sanitize(i, depth + 1));
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (OMIT_FIELDS.has(k)) { result[k] = '[omitted]'; continue; }
    if (typeof v === 'string' && v.length > MAX_STRING) { result[k] = v.substring(0, MAX_STRING) + '…'; continue; }
    result[k] = typeof v === 'object' ? sanitize(v, depth + 1) : v;
  }
  return result;
}

function computeDiff(before: any, after: any): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter(k => !NOISE_FIELDS.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  const { ownerId, actor, action, entity, before, after, source = 'dashboard', metadata } = params;
  const cleanBefore = before ? sanitize(before) : undefined;
  const cleanAfter = after ? sanitize(after) : undefined;
  const diff = computeDiff(cleanBefore, cleanAfter);

  try {
    await rtdb.ref(`audit_logs/${ownerId}`).push({
      timestamp: new Date().toISOString(),
      actor,
      action,
      entity,
      ...(cleanBefore !== undefined ? { before: cleanBefore } : {}),
      ...(cleanAfter !== undefined ? { after: cleanAfter } : {}),
      ...(diff.length > 0 ? { diff } : {}),
      source,
      metadata: metadata || {},
    });
  } catch (e) {
    console.warn('[audit] write failed:', (e as any)?.message);
  }
}
