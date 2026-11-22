import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
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

/** Vérifie la signature binaire du fichier */
export function hasImageSignature(filePath: string, mime: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(8);
    fs.readSync(fd, header, 0, 8, 0);
    fs.closeSync(fd);

    const sigs = SIGNATURES[mime];
    if (!sigs) return false;
    return sigs.some((sig) => header.slice(0, sig.length).equals(sig));
  } catch {
    return false;
  }
}

/** Calcule le chemin complet du fichier avatar à partir du nom */
export function avatarFilePath(filename: string): string {
  return path.join(config.avatarDir, filename);
}

/** S'assure que le répertoire des avatars existe */
function ensureAvatarDir(): void {
  if (!fs.existsSync(config.avatarDir)) {
    fs.mkdirSync(config.avatarDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureAvatarDir();
    cb(null, config.avatarDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `avatar-${unique}${ext}`);
  },
});

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

/** Middleware Express : traite l'upload d'un avatar (champ "avatar") */
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
