import { Router, Request, Response } from 'express';

export const reservationRouter = Router();

// Placeholder health route for the router (optional)
reservationRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'ms3-reservations',
    message: 'Reservation router mounted',
  });
});

// Future routes (create, list, etc.) will be added here.
