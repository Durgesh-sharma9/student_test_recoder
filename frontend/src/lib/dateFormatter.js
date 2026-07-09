/**
 * Global Date Formatter
 * 
 * Formats dates for UI display in dd-MM-yyyy format
 * 
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in dd-MM-yyyy format
 */
export const formatDisplayDate = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format date with short month name (e.g., 09-Jun-2026)
 * 
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in dd-MMM-yyyy format
 */
export const formatDisplayDateShort = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format date for display in toLocaleDateString format with en-GB locale
 * This is a wrapper for consistency
 * 
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string
 */
export const formatDisplayDateLocale = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatRelativeTime = (date) => {
  if (!date) return 'Never';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return 'Just now';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  if (diffMs < minute) return 'Just now';

  const minutes = Math.floor(diffMs / minute);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(diffMs / hour);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(diffMs / day);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(diffMs / week);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(diffMs / month);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};
