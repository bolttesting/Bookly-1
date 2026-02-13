// Common IANA timezones for business settings

export interface Timezone {
  value: string;
  label: string;
  offset: string;
}

// Generate offset string (e.g. "UTC-5") from IANA timezone
function getOffset(tz: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value ?? '';
  } catch {
    return '';
  }
}

// Common timezones grouped by region
const TIMEZONE_IDS = [
  // Americas
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Bogota',
  'America/Lima',
  'America/Caracas',
  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/Dublin',
  'Europe/Zurich',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  // Asia Pacific
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Ho_Chi_Minh',
  // Australia
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  // Africa
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  // Pacific
  'Pacific/Auckland',
  'Pacific/Fiji',
  // UTC
  'UTC',
];

export const TIMEZONES: Timezone[] = TIMEZONE_IDS.map((value) => {
  const offset = getOffset(value);
  const label = value.replace(/_/g, ' ');
  return {
    value,
    label: offset ? `${label} (${offset})` : label,
    offset,
  };
});

export function getTimezoneByValue(value: string): Timezone | undefined {
  return TIMEZONES.find((t) => t.value === value);
}
