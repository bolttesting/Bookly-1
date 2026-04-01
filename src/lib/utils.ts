import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Readable text for API/query errors (avoids showing "[object Object]"). */
export function formatErrorMessage(err: unknown): string {
  if (err == null) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error && typeof err.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.message === 'string' && o.message.trim()) parts.push(o.message.trim());
    if (typeof o.error === 'string' && o.error.trim()) parts.push(o.error.trim());
    if (typeof o.details === 'string' && o.details.trim()) parts.push(o.details.trim());
    if (typeof o.hint === 'string' && o.hint.trim()) parts.push(o.hint.trim());
    if (typeof o.code === 'string' && o.code.trim()) parts.push(`[${o.code}]`);
    if (parts.length > 0) return parts.join(' — ');
    try {
      return JSON.stringify(o);
    } catch {
      return 'Unknown error';
    }
  }
  return String(err);
}
