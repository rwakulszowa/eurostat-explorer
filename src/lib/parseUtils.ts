/**
 * Convert an eurostat date string into a JS Date object.
 * Eurostat dates come in 3 forms:
 * - full year: 2023
 * - quarter: 2023-Q1
 * - month: 2023-01
 */
export function parseDate(date: string): Date {
  const yearRegex = /^(\d{4})$/;
  const quarterRegex = /^(\d{4})-Q(\d)$/;
  const monthRegex = /^(\d{4})-(\d{2})$/;

  const yearMatch = date.match(yearRegex);
  if (yearMatch) {
    const [_, year] = yearMatch;
    return buildDate(parseInt(year), 0);
  }

  const quarterMatch = date.match(quarterRegex);
  if (quarterMatch) {
    const [_, year, quarter] = quarterMatch;
    return buildDate(parseInt(year), 3 * (parseInt(quarter) - 1));
  }

  const monthMatch = date.match(monthRegex);
  if (monthMatch) {
    const [_, year, month] = monthMatch;
    return buildDate(parseInt(year), parseInt(month) - 1);
  }

  throw new Error(`Failed to parse date: ${date}`);
}

function buildDate(year: number, month: number): Date {
  const d = new Date(0);
  d.setFullYear(year);
  d.setMonth(month);
  return d;
}
