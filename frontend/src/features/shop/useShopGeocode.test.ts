import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShopGeocode } from './useShopGeocode';
import { authFetch } from '../auth/services/authService';

vi.mock('../auth/services/authService', () => ({
  authFetch: vi.fn(),
  getStoredUser: vi.fn(),
}));

describe('useShopGeocode Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 -> found avec coordonnées mappées', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          lat: 36.7538,
          lng: 3.0588,
          displayName: '10 Rue Didouche Mourad, Alger',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });

    expect(authFetch).not.toHaveBeenCalled();
    expect(result.current.geoStatus).toBe('idle');

    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.current.geoStatus).toBe('found');
    expect(result.current.coordinates).toEqual({
      latitude: 36.7538,
      longitude: 3.0588,
    });
  });

  it('404 ADDRESS_NOT_FOUND -> notFound', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'ADDRESS_NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('Adresse Fantaisiste Inconnue 9999');
    });

    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.current.geoStatus).toBe('notFound');
    expect(result.current.coordinates).toBeNull();
  });

  it('503 -> unavailable', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'GEOCODER_UNAVAILABLE' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });

    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.current.geoStatus).toBe('unavailable');
    expect(result.current.coordinates).toBeNull();
  });

  it('429 -> unavailable', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'RATE_LIMITED' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });

    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.current.geoStatus).toBe('unavailable');
    expect(result.current.coordinates).toBeNull();
  });

  it('network error -> unavailable', async () => {
    vi.mocked(authFetch).mockRejectedValueOnce(new Error('Network offline failure'));

    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });

    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(result.current.geoStatus).toBe('unavailable');
    expect(result.current.coordinates).toBeNull();
  });

  it('no request fires on typing without blur/Enter', () => {
    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });

    expect(authFetch).not.toHaveBeenCalled();
    expect(result.current.geoStatus).toBe('idle');
  });

  it('blur after an unchanged address fires nothing', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ lat: 36.75, lng: 3.05 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });

    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);

    // Second blur sans modification d'adresse
    await act(async () => {
      result.current.handleBlur();
    });

    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it('a stale response is ignored after a newer lookup', async () => {
    let resolveFirstReq: (res: Response) => void;
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirstReq = resolve;
    });

    let resolveSecondReq: (res: Response) => void;
    const secondPromise = new Promise<Response>((resolve) => {
      resolveSecondReq = resolve;
    });

    vi.mocked(authFetch)
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const { result } = renderHook(() => useShopGeocode());

    // Première recherche (lente)
    act(() => {
      result.current.setAddress('Premiere adresse lente');
    });
    act(() => {
      result.current.handleBlur();
    });

    // Deuxième recherche (rapide)
    act(() => {
      result.current.setAddress('Deuxieme adresse rapide');
    });
    act(() => {
      result.current.handleBlur();
    });

    // La deuxième requête résout en premier avec des coordonnées valides
    await act(async () => {
      resolveSecondReq!(
        new Response(
          JSON.stringify({ lat: 36.80, lng: 3.10, displayName: 'Deuxieme' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    expect(result.current.geoStatus).toBe('found');
    expect(result.current.coordinates).toEqual({ latitude: 36.80, longitude: 3.10 });

    // La première requête (obsolète) résout après coup avec d'autres coordonnées
    await act(async () => {
      resolveFirstReq!(
        new Response(
          JSON.stringify({ lat: 35.00, lng: 1.00, displayName: 'Premiere' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    // Les coordonnées de la deuxième requête doivent être préservées !
    expect(result.current.coordinates).toEqual({ latitude: 36.80, longitude: 3.10 });
  });

  it('abort on unmount', () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(authFetch).mockImplementation((_url, init) => {
      capturedSignal = init?.signal as AbortSignal;
      return new Promise(() => {}); // Requête pendante
    });

    const { result, unmount } = renderHook(() => useShopGeocode());

    act(() => {
      result.current.setAddress('10 Rue Didouche Mourad, Alger');
    });
    act(() => {
      result.current.handleBlur();
    });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
