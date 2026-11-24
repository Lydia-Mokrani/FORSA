import { describe, it, expect } from 'vitest';
import { buildShopPayload, isValidUrl, buildOpeningHours } from './buildShopPayload';

describe('isValidUrl', () => {
  it('accepts valid http and https URLs', () => {
    expect(isValidUrl('https://example.com/logo.png')).toBe(true);
    expect(isValidUrl('http://sub.domain.co/path?query=1')).toBe(true);
    expect(isValidUrl('  https://example.com/logo.png  ')).toBe(true);
  });

  it('rejects invalid or non-http URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com/file')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl(null as any)).toBe(false);
    expect(isValidUrl(undefined as any)).toBe(false);
  });
});

describe('buildOpeningHours', () => {
  it('returns originalHours untouched when hoursEdited is false and originalHours is defined', () => {
    const original = { monday: { open: '09:00', close: '18:00' }, closed: false };
    expect(buildOpeningHours(original, '10:00', '22:00', false)).toBe(original);
  });

  it('updates openingHours when hoursEdited is true', () => {
    const original = {
      monday: { open: '09:00', close: '18:00' },
      sunday: { closed: true },
    };
    const updated = buildOpeningHours(original, '08:30', '19:30', true);
    expect(updated.monday).toEqual({ open: '08:30', close: '19:30' });
    expect(updated.sunday).toEqual({ closed: true });
  });

  it('falls back to default open/close object when no originalHours provided', () => {
    expect(buildOpeningHours(null, '08:00', '20:00', true)).toEqual({
      open: '08:00',
      close: '20:00',
    });
  });
});

describe('buildShopPayload', () => {
  // 1. creation with empty optional fields (no nulls anywhere)
  it('omits all optional fields on creation when empty, emitting NO nulls anywhere', () => {
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      category: '',
      registryNumber: '',
      description: '',
      logoUrl: '',
      openTime: '09:00',
      closeTime: '19:00',
    };
    const payload = buildShopPayload(form, null, { status: 'idle', coordinates: null });

    expect(payload).toEqual({
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      openingHours: { open: '09:00', close: '19:00' },
    });

    expect('category' in payload).toBe(false);
    expect('registryNumber' in payload).toBe(false);
    expect('description' in payload).toBe(false);
    expect('logoUrl' in payload).toBe(false);
    expect('latitude' in payload).toBe(false);
    expect('longitude' in payload).toBe(false);

    expect(payload.category).toBeUndefined();
    expect(payload.registryNumber).toBeUndefined();
    expect(payload.description).toBeUndefined();
    expect(payload.logoUrl).toBeUndefined();
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();

    // Verify absolutely NO nulls anywhere in values
    expect(Object.values(payload).includes(null)).toBe(false);
  });

  // 2. update changing only the phone (no coordinate keys)
  it('omits coordinate keys during update when only phone is changed and shop has stored coordinates', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      category: 'Alimentation',
      registryNumber: '123456789',
      description: 'Une belle boutique',
      hasStoredCoordinates: true,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
      openingHours: { open: '08:00', close: '20:00' },
    };
    const form = {
      name: 'Boutique Test',
      phone: '0987654321', // phone changed
      address: '10 Rue de la Paix, Paris', // address unchanged
      category: 'Alimentation',
      registryNumber: '123456789',
      description: 'Une belle boutique',
      logoUrl: '',
    };
    const geo = {
      status: 'idle' as const,
      coordinates: null,
    };
    const payload = buildShopPayload(form, saved, geo);

    expect(payload.phone).toBe('0987654321');
    expect('latitude' in payload).toBe(false);
    expect('longitude' in payload).toBe(false);
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
  });

  // 3. address changed + found (both coordinates, numbers)
  it('sends both coordinates as numbers when address is changed and geocoding is found', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      hasStoredCoordinates: true,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '25 Avenue des Champs-Elysées, Paris', // address changed
      category: '',
      registryNumber: '',
      description: '',
      logoUrl: '',
    };
    const geo = {
      status: 'found' as const,
      coordinates: { latitude: 48.8698, longitude: 2.3075 },
    };
    const payload = buildShopPayload(form, saved, geo);

    expect(payload.address).toBe('25 Avenue des Champs-Elysées, Paris');
    expect(payload.latitude).toBe(48.8698);
    expect(payload.longitude).toBe(2.3075);
    expect(typeof payload.latitude).toBe('number');
    expect(typeof payload.longitude).toBe('number');
  });

  // 4. address changed + notFound (no coordinate keys)
  it('omits coordinate keys completely when address is changed and geocoding is notFound', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      hasStoredCoordinates: true,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: 'Rue Inexistante 999999', // address changed
      category: '',
      registryNumber: '',
      description: '',
      logoUrl: '',
    };
    const geo = {
      status: 'notFound' as const,
      coordinates: null,
    };
    const payload = buildShopPayload(form, saved, geo);

    expect(payload.address).toBe('Rue Inexistante 999999');
    expect('latitude' in payload).toBe(false);
    expect('longitude' in payload).toBe(false);
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
    expect(payload.latitude).not.toBeNull();
    expect(payload.longitude).not.toBeNull();
  });

  // 5. address changed + unavailable (none)
  it('omits coordinate keys completely when address is changed and geocoding is unavailable', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      hasStoredCoordinates: true,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '50 Rue de Rivoli, Paris', // address changed
      category: '',
      registryNumber: '',
      description: '',
      logoUrl: '',
    };
    const geo = {
      status: 'unavailable' as const,
      coordinates: null,
    };
    const payload = buildShopPayload(form, saved, geo);

    expect(payload.address).toBe('50 Rue de Rivoli, Paris');
    expect('latitude' in payload).toBe(false);
    expect('longitude' in payload).toBe(false);
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
    expect(payload.latitude).not.toBeNull();
    expect(payload.longitude).not.toBeNull();
  });

  // 5b. address changed + idle (no coordinate keys)
  it('omits coordinate keys completely when address is changed and geocoding is idle', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      hasStoredCoordinates: true,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '50 Rue de Rivoli, Paris', // address changed
      category: '',
      registryNumber: '',
      description: '',
      logoUrl: '',
    };
    const geo = {
      status: 'idle' as const,
      coordinates: null,
    };
    const payload = buildShopPayload(form, saved, geo);

    expect(payload.address).toBe('50 Rue de Rivoli, Paris');
    expect('latitude' in payload).toBe(false);
    expect('longitude' in payload).toBe(false);
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
    expect(payload.latitude).not.toBeNull();
    expect(payload.longitude).not.toBeNull();
  });

  // 6. cleared optional field (behaviour from point 2)
  it('sends null when previously saved optional field is cleared by user', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      category: 'Boulangerie',
      registryNumber: 'RC123456',
      description: 'Ancienne description',
      logoUrl: 'https://example.com/old-logo.png',
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      category: '', // cleared
      registryNumber: '', // cleared
      description: '', // cleared
      logoUrl: '', // cleared
    };
    const payload = buildShopPayload(form, saved, null);

    expect(payload.category).toBeNull();
    expect(payload.registryNumber).toBeNull();
    expect(payload.description).toBeNull();
    expect(payload.logoUrl).toBeNull();
  });

  // 7. openingHours untouched when the user did not edit it
  it('preserves openingHours untouched when user did not edit it', () => {
    const complexHours = {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      sunday: { closed: true },
    };
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      openingHours: complexHours,
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      originalHours: complexHours,
      hoursEdited: false, // untouched!
      openTime: '10:00',
      closeTime: '22:00',
    };
    const payload = buildShopPayload(form, saved, null);

    expect(payload.openingHours).toBe(complexHours);
    expect(payload.openingHours).toEqual({
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      sunday: { closed: true },
    });
  });

  // 8. invalid logoUrl is omitted from payload
  it('omits logoUrl if it is not a valid http/https URL', () => {
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      logoUrl: 'not-a-valid-url',
    };
    const payload = buildShopPayload(form, null, null);

    expect('logoUrl' in payload).toBe(false);
    expect(payload.logoUrl).toBeUndefined();
  });

  // 9. valid logoUrl is included
  it('includes logoUrl when it is a valid https URL', () => {
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      logoUrl: 'https://cdn.example.com/logo.png',
    };
    const payload = buildShopPayload(form, null, null);

    expect(payload.logoUrl).toBe('https://cdn.example.com/logo.png');
  });

  // 10. address unchanged without stored coordinates + found sends coordinates
  it('sends coordinates when address is unchanged but shop had no stored coordinates and geocoding found them', () => {
    const saved = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
      hasStoredCoordinates: false,
      coordinates: null,
    };
    const form = {
      name: 'Boutique Test',
      phone: '0123456789',
      address: '10 Rue de la Paix, Paris',
    };
    const geo = {
      status: 'found' as const,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
    };
    const payload = buildShopPayload(form, saved, geo);

    expect(payload.latitude).toBe(48.8566);
    expect(payload.longitude).toBe(2.3522);
  });
});
