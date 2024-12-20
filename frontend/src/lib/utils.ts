import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import '@/lib/traverse-init';
import traverse from 'traverse';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function urlSafeObject(obj: any) {
  // eslint-disable-next-line
  return traverse(obj).map(function (x) {
    if (typeof x === 'string') {
      this.update(encodeURIComponent(x));
    } else if (x === undefined || x === null) {
      this.update('');
    }
  });
}
