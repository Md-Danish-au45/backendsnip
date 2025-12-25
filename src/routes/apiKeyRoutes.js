import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  generateUserApiKey,
  getApiKey,
  regenerateApiKey,
  revokeApiKey
} from '../controllers/apiKeyController.js';

const router = express.Router();

// All routes are protected with JWT authentication
// Users must be logged in to manage their API keys

/**
 * @route   POST /api/users/api-key/generate
 * @desc    Generate new API key for authenticated user
 * @access  Private
 */
router.post('/generate', protect, generateUserApiKey);

/**
 * @route   GET /api/users/api-key
 * @desc    Get current API key (masked) for authenticated user
 * @access  Private
 */
router.get('/', protect, getApiKey);

/**
 * @route   POST /api/users/api-key/regenerate
 * @desc    Regenerate API key for authenticated user
 * @access  Private
 */
router.post('/regenerate', protect, regenerateApiKey);

/**
 * @route   DELETE /api/users/api-key/revoke
 * @desc    Revoke/delete API key for authenticated user
 * @access  Private
 */
router.delete('/revoke', protect, revokeApiKey);

export default router;