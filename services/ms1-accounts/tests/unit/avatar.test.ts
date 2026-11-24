import {
  hasImageSignature,
  AVATAR_MAX_SIZE,
  AVATAR_ALLOWED_MIMES,
  handleAvatarUpload,
} from '../../src/middleware/avatar-upload.middleware';
import { UserController } from '../../src/controllers/user.controller';
import { prisma } from '../../src/config/prisma';
import * as devDbModule from '../../src/services/dev-db.service';
import { NotFoundError } from '@forsa/common';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Avatars — Magic Bytes, Taille Max 2 Mo & ID Non Devinable (LOT 5B-1-close)', () => {
  beforeEach(() => {
    jest.spyOn(devDbModule, 'isPostgresAlive').mockResolvedValue(true);
  });

  describe('1. Magic Bytes & Limite 2 Mo', () => {
    it('limite la taille des avatars à 2 Mo et autorise uniquement JPEG, PNG, WebP', () => {
      expect(AVATAR_MAX_SIZE).toBe(2 * 1024 * 1024);
      expect(AVATAR_ALLOWED_MIMES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    });

    it('valide les signatures binaires authentiques JPEG, PNG et WebP', () => {
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const webpBuf = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x24, 0x00, 0x00, 0x00, // size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);

      expect(hasImageSignature(jpegBuf, 'image/jpeg')).toBe(true);
      expect(hasImageSignature(pngBuf, 'image/png')).toBe(true);
      expect(hasImageSignature(webpBuf, 'image/webp')).toBe(true);
    });

    it('rejette les faux magic bytes (ex: RIFF+WAVE pour WebP, texte brut pour JPEG, SVG)', () => {
      const fakeWebpWav = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, // WAVE
      ]);
      const textSpoof = Buffer.from('not-an-image');

      expect(hasImageSignature(fakeWebpWav, 'image/webp')).toBe(false);
      expect(hasImageSignature(textSpoof, 'image/jpeg')).toBe(false);
      expect(hasImageSignature(textSpoof, 'image/png')).toBe(false);
      expect(hasImageSignature(Buffer.from('<svg/>'), 'image/svg+xml')).toBe(false);
    });

    it('rejette un fichier dépassant 2 Mo au niveau du middleware Multer', (done) => {
      const oversized = Buffer.alloc(AVATAR_MAX_SIZE + 100);
      const boundary = '----forsaBoundaryTest';
      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="big.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
        ),
        oversized,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const { Readable } = require('stream');
      const req: any = new Readable({
        read() {
          this.push(body);
          this.push(null);
        },
      });
      req.headers = {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      };

      const res: any = {};
      handleAvatarUpload(req, res, (err: any) => {
        expect(err).toBeDefined();
        expect(err.code).toBe('FILE_TOO_LARGE');
        expect(err.statusCode).toBe(400);
        done();
      });
    });
  });

  describe('2. ID Aléatoire Non Devinable & Ancienne URL', () => {
    it('génère un avatarId aléatoire 128-bit distinct du userId et le stocke en base', async () => {
      const userId = 'usr-owner-12345';
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const req: any = {
        user: { sub: userId },
        file: {
          buffer: jpegBuf,
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await UserController.uploadAvatar(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledTimes(1);

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: userId });
      expect(updateCall.data.avatarId).toMatch(/^[a-f0-9]{32}$/);
      expect(updateCall.data.avatarId).not.toContain(userId);
      expect(updateCall.data.avatarUrl).toBe(`/api/users/avatars/${updateCall.data.avatarId}.jpg`);
      expect(res.json).toHaveBeenCalledWith({
        avatarUrl: `/api/users/avatars/${updateCall.data.avatarId}.jpg`,
      });
    });

    it('getAvatar interroge uniquement avatarId ou avatarUrl courant (jamais user.id) et renvoie 404 pour une URL devinée', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const req: any = { params: { filename: 'usr-victim-uuid.jpg' } };
      const res: any = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();

      await UserController.getAvatar(req, res, next);

      const queryWhere = (prisma.user.findFirst as jest.Mock).mock.calls[0][0].where;
      expect(queryWhere.OR).toEqual([
        { avatarId: 'usr-victim-uuid' },
        { avatarUrl: '/api/users/avatars/usr-victim-uuid.jpg' },
      ]);
      // Ne doit jamais rechercher par { id: ... }
      expect(JSON.stringify(queryWhere)).not.toContain('"id":');
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('conserve l ancienne URL fonctionnelle uniquement tant qu elle est l avatarUrl courante du propriétaire', async () => {
      const fakeBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        avatarData: fakeBuffer,
        avatarMime: 'image/png',
      });

      const req: any = { params: { filename: 'legacy-owner-id.png' } };
      const res: any = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();

      await UserController.getAvatar(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(fakeBuffer);
    });
  });
});
