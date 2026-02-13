import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { authenticateAdmin } from '../middleware/clinicAuth.js';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `admin-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload avatar endpoint
router.post('/upload-avatar', authenticateAdmin, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Update user's avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar_url: avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        roles: true,
        profile: {
          select: {
            bio: true,
            avatar_url: true
          }
        }
      }
    });

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        roles: true,
        profile: {
          select: {
            bio: true,
            avatar_url: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update admin profile
router.put('/profile', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, phone, bio, avatar_url } = req.body;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    // Update user data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (avatar_url) updateData.avatar_url = avatar_url;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        roles: true,
        profile: {
          select: {
            bio: true,
            avatar_url: true
          }
        }
      }
    });

    // Update or create profile if bio is provided
    if (bio !== undefined) {
      await prisma.profile.upsert({
        where: { user_id: req.user.id },
        update: { bio },
        create: {
          user_id: req.user.id,
          bio
        }
      });

      // Fetch updated user with profile
      const userWithProfile = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar_url: true,
          roles: true,
          profile: {
            select: {
              bio: true,
              avatar_url: true
            }
          }
        }
      });

      return res.json({
        message: 'Profile updated successfully',
        user: userWithProfile
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password endpoint
router.put('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }


    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;