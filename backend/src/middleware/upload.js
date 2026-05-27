import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.xlsx', '.xls'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only Excel files (.xlsx, .xls) are allowed.'), false);
  }
};

export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
