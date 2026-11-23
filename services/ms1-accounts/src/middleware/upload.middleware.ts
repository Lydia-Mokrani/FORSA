// services/ms1-accounts/src/middleware/upload.middleware.ts
import multer from 'multer';
import { BadRequestError } from '@forsa/common';

// Stockage en mémoire vive (Buffer) : suppression intégrale du stockage disque local
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Acceptation stricte de PDF, JPG et PNG (suppression de webp)
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Type de fichier non autorisé (${file.mimetype}). Seuls PDF, JPG, PNG sont acceptés.`));
  }
};

export const documentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Mo max par fichier
  },
});
