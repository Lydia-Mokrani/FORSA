// Tests for ReservationService business logic
import { ReservationService } from '../services/reservation.service';
import { MS2Service } from '../services/ms2.service';
import { prisma } from '../config/prisma';
import QRCode from 'qrcode';
import { BadRequestError } from '@forsa/common';

jest.mock('../services/ms2.service');
jest.mock('../config/prisma', () => ({
  prisma: {
    reservation: { findUnique: jest.fn(), create: jest.fn() },
    customerNoShow: { findUnique: jest.fn() },
  },
}));
jest.mock('qrcode');

const mockedPrisma = jest.mocked(prisma);
const mockedMS2 = jest.mocked(MS2Service);
const mockedQRCodeToDataURL = QRCode.toDataURL as unknown as jest.Mock;

describe('ReservationService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('generatePickupCode produces correct format', () => {
    const reservationService = ReservationService as unknown as { generatePickupCode(): string };
    const code = reservationService.generatePickupCode();
    expect(code).toMatch(/^FRS-[A-Za-z0-9]{6}$/);
    const second = reservationService.generatePickupCode();
    expect(second).not.toBe(code); // very likely different
  });

  test('createReservation success flow', async () => {
    const offer = { pickupStart: '2024-01-01T10:00:00Z', pickupEnd: '2024-01-01T12:00:00Z' };
    mockedMS2.fetchOffer.mockResolvedValue(offer);
    mockedMS2.reserveStock.mockResolvedValue({});
    mockedPrisma.reservation.findUnique.mockResolvedValue(null); // no collision
    mockedQRCodeToDataURL.mockResolvedValue('data:image/png;base64,AAA');
    const reservationObj = { id: 'uuid', pickupCode: 'FRS-ABC123' };
    mockedPrisma.reservation.create.mockResolvedValue(reservationObj as never);

    const result = await ReservationService.createReservation({
      customerId: 'cust1',
      customerEmail: 'c@example.com',
      shopId: 'shop1',
      offerId: 'offer1',
      quantity: 2,
      unitPrice: '10.00',
    });
    expect(result).toBe(reservationObj);
    expect(result.pickupCode).toMatch(/^FRS-[A-Za-z0-9]{6}$/);
    expect(mockedQRCodeToDataURL).toHaveBeenCalled();
  });

  test('createReservation fails when MS2 missing pickup window', async () => {
    mockedMS2.fetchOffer.mockResolvedValue({}); // no pickupStart/end
    await expect(
      ReservationService.createReservation({
        customerId: 'c',
        customerEmail: 'e',
        shopId: 's',
        offerId: 'o',
        quantity: 1,
        unitPrice: '5',
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
