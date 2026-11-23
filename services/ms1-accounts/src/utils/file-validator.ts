// services/ms1-accounts/src/utils/file-validator.ts

export type AllowedMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

/**
 * Détecte le type réel du fichier à partir de ses "magic bytes" (signatures binaires).
 * - PDF : commence par %PDF- (0x25 0x50 0x44 0x46)
 * - PNG : 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
 * - JPEG : commence par 0xFF 0xD8 0xFF
 */
export function detectMagicBytes(buffer: Buffer): AllowedMimeType | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // 1. PDF : %PDF (0x25, 0x50, 0x44, 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // 2. PNG : 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. JPEG : 0xFF 0xD8 0xFF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  return null;
}

export interface FileValidationResult {
  valid: boolean;
  detectedMime?: AllowedMimeType;
  error?: string;
  code?: 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE';
}

/**
 * Valide un fichier uploadé : taille maximale (5 Mo) et conformité des magic bytes.
 */
export function validateDocumentFile(file: {
  buffer: Buffer;
  size?: number;
  mimetype?: string;
  originalname?: string;
}): FileValidationResult {
  const actualSize = file.size !== undefined ? file.size : file.buffer.length;

  if (actualSize > MAX_DOCUMENT_FILE_SIZE || file.buffer.length > MAX_DOCUMENT_FILE_SIZE) {
    return {
      valid: false,
      error: 'La taille du fichier dépasse la limite autorisée de 5 Mo.',
      code: 'FILE_TOO_LARGE',
    };
  }

  const detectedMime = detectMagicBytes(file.buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'Type de fichier non autorisé. Seuls les fichiers PDF, JPG et PNG authentiques sont acceptés.',
      code: 'INVALID_FILE_TYPE',
    };
  }

  return {
    valid: true,
    detectedMime,
  };
}
