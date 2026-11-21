import { MS2Service } from '../services/ms2.service';
import { internalAxios } from '../config/axios';
import { BadRequestError } from '@forsa/common';

jest.mock('../config/axios');

const mockedPost = jest.fn();
(internalAxios as any).post = mockedPost;

describe('MS2Service endpoint URLs', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({ status: 200, data: {} });
  });

  it('calls correct reserve URL', async () => {
    await MS2Service.reserveStock('offer123', 'res-uuid', 2);
    expect(mockedPost).toHaveBeenCalledWith('/internal/offers/offer123/reserve', {
      reservationId: 'res-uuid',
      quantity: 2,
    });
  });

  it('calls correct release URL', async () => {
    await MS2Service.releaseStock('offerABC', 'res-uuid', 1);
    expect(mockedPost).toHaveBeenCalledWith('/internal/offers/offerABC/release', {
      reservationId: 'res-uuid',
      quantity: 1,
    });
  });

  it('throws BadRequestError on non‑200 response', async () => {
    mockedPost.mockResolvedValue({ status: 400, data: {} });
    await expect(MS2Service.reserveStock('x', 'y', 1)).rejects.toBeInstanceOf(BadRequestError);
  });
});
