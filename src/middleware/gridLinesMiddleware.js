
import { body, validationResult } from 'express-validator';

export const validatePan = [
  body('panNumber')
    .trim()
    .notEmpty()
    .withMessage('PAN number is required.')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters long.')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number format.'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];