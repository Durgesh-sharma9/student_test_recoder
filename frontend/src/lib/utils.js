import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatClassName(className) {
  if (!className) return className;
  
  // Case-insensitive mapping/check
  const formattedMap = {
    'NURSERY': 'Nursery',
    'LKG': 'LKG',
    'UKG': 'UKG',
    'PREP': 'Prep',
  };
  
  const upperName = String(className).toUpperCase().trim();
  if (formattedMap[upperName]) {
    return formattedMap[upperName];
  }
  
  // Check if it's a number (1, 2, 3, etc.)
  const num = parseInt(className, 10);
  if (!isNaN(num) && num.toString() === className) {
    return `Class ${className}`;
  }
  
  // Return as-is for any other format
  return className;
}
