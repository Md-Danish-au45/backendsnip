// utils/generateToken.js
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  // Including the role in the token payload will be useful for frontend logic
  // but backend authorization should ALWAYS rely on the database record via `protect` middleware.
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export default generateToken;