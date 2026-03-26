import { describe, expect, it } from 'vitest';
import { describeCron } from './cron';

describe('describeCron', () => {
  it('returns "Every minute" for wildcard cron', () => {
    expect(describeCron('* * * * *')).toBe('Every minute');
  });

  it('returns hourly description for "0 * * * *"', () => {
    const result = describeCron('0 * * * *');
    expect(result).toContain('hour');
    expect(result).toContain('0');
  });

  it('returns daily description with hour and minute for "30 9 * * *"', () => {
    const result = describeCron('30 9 * * *');
    expect(result).toContain('9');
    expect(result).toContain('30');
  });

  it('returns weekly description for "0 0 * * 0"', () => {
    const result = describeCron('0 0 * * 0');
    expect(result.toLowerCase()).toMatch(/sun(day)?/);
  });

  it('returns monthly description for "0 6 1 * *"', () => {
    const result = describeCron('0 6 1 * *');
    expect(result).toContain('1');
    expect(result).toContain('6');
  });

  it('returns yearly description for "0 0 1 1 *"', () => {
    const result = describeCron('0 0 1 1 *');
    expect(result.toLowerCase()).toMatch(/jan(uary)?|month 1/);
  });

  it('returns fallback description for unusual pattern "15 3 10 6 3"', () => {
    const result = describeCron('15 3 10 6 3');
    expect(result).toContain('3');
  });

  it('returns the original string if not 5 fields', () => {
    expect(describeCron('0 0 * *')).toBe('0 0 * *');
    expect(describeCron('')).toBe('');
  });
});
