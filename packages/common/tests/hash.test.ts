import { hashString } from '../src/utils/hash';
import crypto from 'crypto';

describe('packages/common: hashString', () => {
  it('doit calculer le SHA-256 hexadécimal exact', () => {
    const raw = 'test-nonce-12345';
    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    expect(hashString(raw)).toBe(expected);
  });

  it('doit être déterministe', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});
