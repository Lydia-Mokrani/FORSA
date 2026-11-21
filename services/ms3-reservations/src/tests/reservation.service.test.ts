// Tests for ReservationService business logic
import { ReservationService } from '../services/reservation.service';
import { MS2Service } from '../services/ms2.service';
import { prisma } from '../config/prisma';
import QRCode from 'qrcode';
import { BadRequestError } from '@forsa/common';

jest.mock('../services/ms2.service');
jest.mock('../config/prisma');
jest.mock('qrcode');

const mockedPrisma = prisma as any;
const mockedMS2 = MS2Service as any;
const mockedQRCode = QRCode as any;

describe('ReservationService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('generatePickupCode produces correct format', () => {
    // private method via any
    const code = (ReservationService as any).generatePickupCode();
    expect(code).toMatch(/^FRS-[A-Za-z0-9]{6}$/);
    const second = (ReservationService as any).generatePickupCode();
    expect(second).not.toBe(code); // very likely different
  });

  test('createReservation success flow', async () => {
    const offer = { pickupStart: '2024-01-01T10:00:00Z', pickupEnd: '2024-01-01T12:00:00Z' };
    mockedMS2.fetchOffer.mockResolvedValue(offer);
    mockedMS2.reserveStock.mockResolvedValue({});
    mockedPrisma.reservation.findUnique.mockResolvedValue(null); // no collision
    mockedQRCode.toDataURL.mockResolvedValue('data:image/png;base64,AAA');
    const reservationObj = { id: 'uuid', pickupCode: 'FRS-ABC123' };
    mockedPrisma.reservation.create.mockResolvedValue(reservationObj);

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
    expect(mockedQRCode.toDataURL).toHaveBeenCalled();
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
