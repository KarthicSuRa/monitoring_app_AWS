import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow as fnsFormatDistanceToNow, isValid } from 'date-fns';
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDistanceToNow = (date: Date): string => {
  if (!isValid(date)) return 'Unknown';
  return fnsFormatDistanceToNow(date, { addSuffix: true });
};
