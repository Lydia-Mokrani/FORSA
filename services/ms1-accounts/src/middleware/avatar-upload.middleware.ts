import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@forsa/common';
import { config } from '../config/env';

export const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
export const AVATAR_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/** Vérifie la signature binaire stricte du fichier (JPEG, PNG 8 octets, WebP RIFF+WEBP) */
export function hasImageSignature(target: string | Buffer, mime: string): boolean {
  try {
    if (!AVATAR_ALLOWED_MIMES.includes(mime)) return false;

    let header: Buffer;
    if (Buffer.isBuffer(target)) {
      header = target.subarray(0, 12);
    } else {
      if (!fs.existsSync(target)) return false;
      const fd = fs.openSync(target, 'r');
      header = Buffer.alloc(12);
      const bytesRead = fs.readSync(fd, header, 0, 12, 0);
      fs.closeSync(fd);
      header = header.subarray(0, bytesRead);
    }

    if (mime === 'image/jpeg') {
      return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }

    if (mime === 'image/png') {
      const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return header.length >= 8 && header.subarray(0, 8).equals(pngSig);
    }

    if (mime === 'image/webp') {
      const riff = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF
      const webp = Buffer.from([0x57, 0x45, 0x42, 0x50]); // WEBP
      return (
        header.length >= 12 &&
        header.subarray(0, 4).equals(riff) &&
        header.subarray(8, 12).equals(webp)
      );
    }

    return false;
  } catch {
    return false;
  }
}

/** Calcule le chemin complet du fichier avatar rétrocompatible sur le disque (protégé contre path traversal) */
export function avatarFilePath(filename: string): string {
  const safeName = path.basename(filename);
  return path.join(config.avatarDir, safeName);
}

// Stockage 100% en mémoire vive : suppression complète des écritures sur le disque local
const storage = multer.memoryStorage();

export const avatarUpload = multer({
  storage,
  limits: { fileSize: AVATAR_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Seuls JPG, PNG et WebP sont acceptés') as any, false);
    }
  },
});

/** Middleware Express : traite l'upload d'un avatar (champ "avatar") en mémoire tampon */
export function handleAvatarUpload(req: Request, res: Response, next: NextFunction): void {
  avatarUpload.single('avatar')(req, res, (err) => {
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
