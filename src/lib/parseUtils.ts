/**
 * Build a UTC date representing `year`.
 */
export function yearToDate(year: number): Date {
  const d = new Date(0);
  d.setFullYear(year);
  return d;
}
