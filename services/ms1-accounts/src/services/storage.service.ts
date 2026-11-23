// services/ms1-accounts/src/services/storage.service.ts
import { prisma } from '../config/prisma';

export interface StorageResult {
  key: string;
  size: number;
}

export interface StoredFile {
  data: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Interface de stockage abstraite pour les documents justificatifs
 */
export interface StorageService {
  put(id: string, data: Buffer, mimeType: string, filename?: string): Promise<StorageResult>;
  get(id: string): Promise<StoredFile | null>;
  delete(id: string): Promise<void>;
}

/**
 * Driver de stockage adossé à la base de données PostgreSQL (colonne BYTEA file_data)
 * Garantit qu'aucun fichier n'est exposé via une URL publique.
 */
export class DatabaseStorageService implements StorageService {
  async put(id: string, data: Buffer, _mimeType: string, _filename?: string): Promise<StorageResult> {
    await prisma.shopDocument.update({
      where: { id },
      data: {
        fileData: data,
        storagePath: `db://${id}`,
      },
    });

    return {
      key: `db://${id}`,
      size: data.length,
    };
  }

  async get(id: string): Promise<StoredFile | null> {
    const doc = await prisma.shopDocument.findUnique({
      where: { id },
      select: {
        fileData: true,
        mimeType: true,
        originalName: true,
      },
    });

    if (!doc || !doc.fileData) {
      return null;
    }

    return {
      data: Buffer.from(doc.fileData),
      mimeType: doc.mimeType,
      filename: doc.originalName,
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.shopDocument.update({
      where: { id },
      data: {
        fileData: null,
        storagePath: null,
      },
    });
  }
}

export const storageService = new DatabaseStorageService();
