/**
 * Global Date Formatter
 * 
 * Formats dates for UI display in DD/MM/YYYY format
 * 
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in DD/MM/YYYY format
 */
export const formatDisplayDate = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date with short month name (e.g., 09/Jun/2026)
 * 
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in DD/MMM/YYYY format
 */
export const formatDisplayDateShort = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
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
