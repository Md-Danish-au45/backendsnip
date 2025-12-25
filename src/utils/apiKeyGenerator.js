import crypto from 'crypto';

/**
 * Generate a new API key with 'vmk_' prefix
 * @returns {string} API key in format: vmk_[64 hex characters]
 */

export const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(32); // 32 bytes = 64 hex characters
  const apiKey = 'vmk_' + randomBytes.toString('hex');
  return apiKey;
};

/**
 * Hash API key for secure storage (optional but recommended)
 * @param {string} apiKey - The API key to hash
 * @returns {string} Hashed API key
 */

export const hashApiKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Verify if a provided API key matches the hashed version
 * @param {string} providedKey - The API key to verify
 * @param {string} hashedKey - The stored hashed API key
 * @returns {boolean} True if keys match
 */
export const verifyApiKey = (providedKey, hashedKey) => {
  const hashedProvidedKey = hashApiKey(providedKey);
  return hashedProvidedKey === hashedKey;
};

export default { generateApiKey, hashApiKey, verifyApiKey };