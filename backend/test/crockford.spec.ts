import { generateCrockfordId, isValidCrockfordId } from '../src/common/utils/crockford';

describe('Crockford Base32 Generator & Validator', () => {
  it('should generate a 10-character string', () => {
    const id = generateCrockfordId();
    expect(id).toHaveLength(10);
  });

  it('should not contain ambiguous characters (I, L, O, U)', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateCrockfordId();
      expect(id).not.toMatch(/[ILOUilou]/);
      expect(isValidCrockfordId(id)).toBe(true);
    }
  });

  it('should reject invalid IDs', () => {
    expect(isValidCrockfordId('12345')).toBe(false); // too short
    expect(isValidCrockfordId('12345678901')).toBe(false); // too long
    expect(isValidCrockfordId('12345I7890')).toBe(false); // contains 'I'
    expect(isValidCrockfordId('12345O7890')).toBe(false); // contains 'O'
    expect(isValidCrockfordId('12345L7890')).toBe(false); // contains 'L'
    expect(isValidCrockfordId('12345U7890')).toBe(false); // contains 'U'
  });
});
