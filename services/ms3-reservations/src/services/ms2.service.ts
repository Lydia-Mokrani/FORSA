// Service for interacting with MS2 stock API
import { internalAxios } from '../config/axios';
import { config } from '../config/env';
import { BadRequestError, ApiError } from '@forsa/common';

export class MS2Service {
  static async reserveStock(offerId: string, reservationId: string, quantity: number) {
    const url = `/internal/offers/${offerId}/reserve`;
    try {
      const resp = await internalAxios.post(url, {
        reservationId,
        quantity,
      });
      if (resp.status !== 200) {
        throw new BadRequestError('MS2 reserve failed');
      }
      return resp.data;
    } catch (err: any) {
      throw new BadRequestError('MS2 reserve error: ' + (err.message ?? err));
    }
  }

  static async releaseStock(offerId: string, reservationId: string, quantity: number) {
    const url = `/internal/offers/${offerId}/release`;
    try {
      const resp = await internalAxios.post(url, {
        reservationId,
        quantity,
      });
      if (resp.status !== 200) {
        throw new BadRequestError('MS2 release failed');
      }
      return resp.data;
    } catch (err: any) {
      // Release failures should not abort main flow but are reported
      throw new BadRequestError('MS2 release error: ' + (err.message ?? err));
    }
  }

  static async fetchOffer(offerId: string) {
    const url = `/internal/offers/${offerId}`;
    try {
      const resp = await internalAxios.get(url);
      if (resp.status !== 200) {
        throw new BadRequestError('MS2 fetch offer failed');
      }
      return resp.data;
    } catch (err: any) {
      throw new BadRequestError('MS2 fetch offer error: ' + (err.message ?? err));
    }
  }
}
