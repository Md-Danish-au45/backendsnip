// controllers/adminController.js

import { validationResult } from 'express-validator';
import User from '../models/UserModel.js'; // Use the User model
import generateToken from '../utils/generateToken.js';
// This function now creates a new User with the 'admin' role
export const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('An account with that email already exists');
    }

    // Create a new user with the role explicitly set to 'admin'
    const adminUser = await User.create({ name, email, password, role: 'admin', isVerified: true });

    if (adminUser) {
        res.status(201).json({
            success: true,
            data: {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
            }
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// This function now logs in a user and verifies they have the 'admin' role
export const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    // Check if user exists AND if they are an admin
    if (!user || user.role !== 'admin') {
      res.status(401);
      throw new Error('Invalid credentials or not an admin');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
        success: true,
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        }
    });

  } catch (error) {
    next(error);
  }
};

// Example of a protected admin-only endpoint
export const getAdminDashboard = async (req, res) => {
    // The req.user object is attached by the 'protect' middleware
    res.status(200).json({
        success: true,
        message: `Welcome to the admin dashboard, ${req.user.name}`,
        data: {
            id: req.user._id,
            email: req.user.email,
            role: req.user.role,
        }
    });
};

export const getAllAdmin = async (req, res, next) => {
    try {
        const admins = await User.find({ role: 'admin' }).select('-password');
        res.status(200).json({
            success: true,
            count: admins.length,
            data: admins
        });
    } catch (error) {
        next(error);
    }
};


// controllers/adminController.js
export const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (admin.role !== "admin") {
      return res.status(400).json({ success: false, message: "Cannot delete non-admin user" });
    }

    await admin.deleteOne();

    res.status(200).json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    next(error);
  }
};

