import { toast } from 'sonner';

export const MAX_IMAGE_SIZE = 500 * 1024; // 500KB
export const MAX_PDF_SIZE = 1 * 1024 * 1024; // 1MB

export const validateFile = (file) => {
  if (!file) return false;

  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    toast.error(`"${file.name || 'Image'}" exceeds 500KB limit (Selected: ${(file.size / 1024).toFixed(0)}KB). Please upload a smaller image.`);
    return false;
  }

  if (isPdf && file.size > MAX_PDF_SIZE) {
    toast.error(`"${file.name || 'PDF'}" exceeds 1MB limit (Selected: ${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller PDF.`);
    return false;
  }

  if (!isImage && !isPdf && file.size > MAX_PDF_SIZE) {
    toast.error(`"${file.name || 'File'}" exceeds 1MB limit`);
    return false;
  }

  return true;
};

export const filterValidFiles = (files) => {
  const fileArray = Array.from(files || []);
  return fileArray.filter(validateFile);
};
