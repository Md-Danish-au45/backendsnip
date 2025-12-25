// utils/cloudinary.js

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary with credentials from environment variables

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} buffer - The file buffer to upload.
 * @param {string} folder - The folder in Cloudinary to store the file.
 * @returns {Promise<object>} - The upload result from Cloudinary.
*/
export const uploadToCloudinary = (buffer, folder) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        quality: 100,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    // Convert buffer to a readable stream and pipe it to Cloudinary's uploader
    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};

/**
 * Deletes a file from Cloudinary using its public ID.
 * @param {string} publicId - The public ID of the file to delete.
 * @returns {Promise<object>} - The deletion result from Cloudinary.
 */
export const deleteFromCloudinary = (publicId) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
    });
};

// Helper to extract public ID from a Cloudinary URL
export const getPublicIdFromUrl = (url) => {
    const parts = url.split('/');
    const publicIdWithExtension = parts.slice(parts.indexOf('upload') + 2).join('/');
    const publicId = publicIdWithExtension.split('.')[0];
    return publicId;
};