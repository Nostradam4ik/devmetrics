import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

describe('cn (class merger)', () => {
  it('merges simple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates conflicting Tailwind classes', () => {
    // tailwind-merge: last bg wins
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

describe('formatDate', () => {
  it('formats an ISO string to readable date', () => {
    const result = formatDate('2026-03-15T00:00:00.000Z');
    // en-US locale: Mar 15, 2026
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/15/);
  });

  it('formats a Date object', () => {
    const d = new Date('2026-01-01T12:00:00Z');
    const result = formatDate(d);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/Jan/);
  });

  it('handles different months', () => {
    expect(formatDate('2026-07-04T00:00:00Z')).toMatch(/Jul/);
    expect(formatDate('2026-12-25T00:00:00Z')).toMatch(/Dec/);
  });
});

describe('formatDateTime', () => {
  it('includes time in output', () => {
    const result = formatDateTime('2026-03-15T14:30:00.000Z');
    expect(result).toMatch(/2026/);
    // Should have hour:minute
    expect(result).toMatch(/:/);
  });

  it('formats a Date object with time', () => {
    const d = new Date('2026-06-10T09:05:00Z');
    const result = formatDateTime(d);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2026/);
  });
});
