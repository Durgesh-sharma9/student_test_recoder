import ImageKit from 'imagekit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if ImageKit credentials are configured
const isConfigured = 
  process.env.IMAGEKIT_PUBLIC_KEY && 
  process.env.IMAGEKIT_PUBLIC_KEY !== 'your_imagekit_public_key' &&
  process.env.IMAGEKIT_PRIVATE_KEY && 
  process.env.IMAGEKIT_PRIVATE_KEY !== 'your_imagekit_private_key' &&
  process.env.IMAGEKIT_URL_ENDPOINT && 
  process.env.IMAGEKIT_URL_ENDPOINT !== 'your_imagekit_url_endpoint';

const imagekit = isConfigured ? new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
}) : null;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const uploadFile = async (file, fileName, folder = 'notifications') => {
  if (isConfigured && imagekit) {
    try {
      const response = await imagekit.upload({
        file: file.buffer,
        fileName: fileName,
        folder: folder,
        useUniqueFileName: true,
      });
      return {
        url: response.url,
        fileId: response.fileId,
        name: response.name,
        fileType: response.fileType,
      };
    } catch (error) {
      console.error('ImageKit upload error:', error);
      throw new Error(`Failed to upload file: ${error.message || error}`);
    }
  } else {
    // Fallback to local storage
    try {
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const localFileName = `${timestamp}_${sanitizedFileName}`;
      const localPath = path.join(uploadsDir, localFileName);
      
      fs.writeFileSync(localPath, file.buffer);
      
      // Return a URL that can be accessed via a static file route
      const url = `/uploads/${localFileName}`;
      
      return {
        url: url,
        fileId: null,
        name: fileName,
        fileType: file.mimetype,
      };
    } catch (error) {
      console.error('Local file upload error:', error);
      throw new Error(`Failed to upload file locally: ${error.message || error}`);
    }
  }
};

export const deleteFile = async (fileId) => {
  if (isConfigured && imagekit) {
    try {
      await imagekit.deleteFile(fileId);
      return true;
    } catch (error) {
      console.error('ImageKit delete error:', error);
      throw new Error(`Failed to delete file: ${error.message || error}`);
    }
  } else {
    // For local files, fileId is the filename
    if (fileId) {
      try {
        const localPath = path.join(uploadsDir, fileId);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        return true;
      } catch (error) {
        console.error('Local file delete error:', error);
        throw new Error(`Failed to delete file locally: ${error.message || error}`);
      }
    }
    return true;
  }
};

export default imagekit;
