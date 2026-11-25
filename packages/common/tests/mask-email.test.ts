import { maskEmail } from '../src/utils/mask-email';

describe('packages/common: maskEmail', () => {
  it('doit masquer une adresse e-mail standard (a***@g***.com)', () => {
    expect(maskEmail('alice@gmail.com')).toBe('a***@g***.com');
  });

  it('doit masquer correctement un e-mail avec sous-domaine ou TLD court', () => {
    expect(maskEmail('kamel.boutique@yahoo.dz')).toBe('k***@y***.dz');
    expect(maskEmail('test.user@company.co.uk')).toBe('t***@c***.uk');
  });

  it('doit gérer les chaînes vides, null ou invalides sans crasher', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(null)).toBe('');
    expect(maskEmail(undefined)).toBe('');
    expect(maskEmail('pas-un-email')).toBe('***');
  });
});
