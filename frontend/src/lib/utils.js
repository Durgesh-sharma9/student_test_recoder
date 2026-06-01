import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatClassName(className) {
  if (!className) return className;
  
  // Preserve these class names as-is
  const preservedNames = ['Nursery', 'LKG', 'UKG', 'Prep'];
  if (preservedNames.includes(className)) {
    return className;
  }
  
  // Check if it's a number (1, 2, 3, etc.)
  const num = parseInt(className, 10);
  if (!isNaN(num) && num.toString() === className) {
    return `Class ${className}`;
  }
  
  // Return as-is for any other format
  return className;
}
