import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@forsa/common';
import { config } from '../config/env';

const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Signatures binaires (magic bytes)
const SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
};

/** Vérifie la signature binaire du fichier (Buffer en mémoire ou chemin disque rétrocompatible) */
export function hasImageSignature(target: string | Buffer, mime: string): boolean {
  try {
    const sigs = SIGNATURES[mime];
    if (!sigs) return false;

    let header: Buffer;
    if (Buffer.isBuffer(target)) {
      header = target.subarray(0, 8);
    } else {
      if (!fs.existsSync(target)) return false;
      const fd = fs.openSync(target, 'r');
      header = Buffer.alloc(8);
      fs.readSync(fd, header, 0, 8, 0);
      fs.closeSync(fd);
    }

    return sigs.some((sig) => header.subarray(0, sig.length).equals(sig));
  } catch {
    return false;
  }
}

/** Calcule le chemin complet du fichier avatar rétrocompatible sur le disque */
export function avatarFilePath(filename: string): string {
  return path.join(config.avatarDir, filename);
}

// Stockage 100% en mémoire vive : suppression complète des écritures sur le disque local
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Seuls JPG, PNG et WebP sont acceptés') as any, false);
    }
  },
});

/** Middleware Express : traite l'upload d'un avatar (champ "avatar") en mémoire tampon */
export function handleAvatarUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, 'FILE_TOO_LARGE', 'La photo ne peut pas dépasser 2 Mo'));
      }
      return next(new ApiError(400, 'UPLOAD_ERROR', err.message));
    }
    if (err) return next(err);
    next();
  });
}
