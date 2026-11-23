import { prisma } from '../config/prisma';

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
}

export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        action: options.action,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        metadata: options.metadata || undefined,
      },
    });
  } catch (err: any) {
    // Ne bloque pas la requête en cas d'erreur de journalisation, mais loggue l'erreur
    console.error(`[AuditLog] Erreur lors de l'enregistrement de l'audit (${options.action}):`, err.message);
  }
}
