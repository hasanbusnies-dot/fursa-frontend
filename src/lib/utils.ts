import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: 'SYP' | 'USD' = 'SYP'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }
  return new Intl.NumberFormat('ar-SY', { style: 'currency', currency: 'SYP' }).format(price);
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

export function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // NEXT_PUBLIC_BACKEND_URL should be the bare server origin, e.g. "http://localhost:3001"
  // Falls back to stripping /api/... from the API URL if the dedicated var isn't set.
  const backendBase =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/api(\/.*)?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const final = `${backendBase}${cleanPath}`;
  console.log('DEBUG_AD_URL:', final);
  return final;
}
