
import multer from 'multer';

// Configure multer to use memory storage.
const storage = multer.memoryStorage();

// Create a filter to only accept image files.
// This prevents users from uploading other file types.
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file (adjust as needed)
    fieldSize: 50 * 1024 * 1024 // max size for non-file fields (for large base64 JSON if used)
  },
});

export default upload;