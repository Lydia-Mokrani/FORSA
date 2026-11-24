import { Request, Response } from 'express';
import { startRateLimiter } from '../../src/middlewares/rate-limit.middleware';
import { prisma } from '../../src/config/prisma';

describe('Per-Phone Rate Limit from Database (/auth/telegram/start)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let headers: Record<string, string>;

  beforeEach(() => {
    headers = {};
    req = {
      body: { phone: '+213555123456' },
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn((name: string, value: string) => {
        headers[name.toLowerCase()] = String(value);
        return res as Response;
      }),
    };
    next = jest.fn();
    process.env.RATE_LIMIT_START_MAX = '3';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('doit autoriser les 3 premières requêtes (count < 3) et appeler next()', async () => {
    // 1ère requête : count = 0
    jest.spyOn(prisma.authChallenge, 'count').mockResolvedValueOnce(0);
    await startRateLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // 2ème requête : count = 1
    jest.spyOn(prisma.authChallenge, 'count').mockResolvedValueOnce(1);
    await startRateLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2);

    // 3ème requête : count = 2
    jest.spyOn(prisma.authChallenge, 'count').mockResolvedValueOnce(2);
    await startRateLimiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(3);

    expect(res.status).not.toHaveBeenCalled();
  });

  it('doit bloquer la 4ème requête (count = 3 >= max) avec HTTP 429 RATE_LIMITED et header Retry-After', async () => {
    // 4ème requête : count = 3
    const tenMinutesAgo = new Date(Date.now() - 4 * 60 * 1000); // Défi créé il y a 4 min -> reste 6 min = 360 s
    jest.spyOn(prisma.authChallenge, 'count').mockResolvedValueOnce(3);
    jest.spyOn(prisma.authChallenge, 'findFirst').mockResolvedValueOnce({
      createdAt: tenMinutesAgo,
    } as any);

    await startRateLimiter(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));

    const retryAfter = Number(headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(600);

    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'RATE_LIMITED',
        message: expect.stringContaining('Trop de demandes'),
        retryAfter: expect.any(Number),
      }),
    });
  });
});
