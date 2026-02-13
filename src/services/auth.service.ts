import User from '../models/User.model';
import { IUser, IUserInput, ILoginInput, IAuthResponse } from '../interfaces/user.interface';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { constants } from '../config/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-change';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export class AuthService {
  async register(userData: IUserInput): Promise<IAuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const user = await User.create(userData);

      // Generate tokens
      const { token, refreshToken } = this.generateTokens(user._id.toString(), user.role);

      return {
        success: true,
        message: 'Registration successful',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
        },
        token,
        refreshToken,
      };
    } catch (error: any) {
      logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  async login(loginData: ILoginInput): Promise<IAuthResponse> {
    try {
      // Find user by email with password selected
      const user = await User.findOne({ email: loginData.email.toLowerCase() }).select('+password');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
      }

      // Generate tokens
      const { token, refreshToken } = this.generateTokens(user._id.toString(), user.role);

      return {
        success: true,
        message: 'Login successful',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
        },
        token,
        refreshToken,
      };
    } catch (error: any) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId)
        .populate({
          path: 'eventsCreated',
          select: 'title date location ticketPrice',
          options: { limit: 5 }
        })
        .populate({
          path: 'ticketsBought',
          select: 'event ticketNumber status purchaseDate',
          options: { limit: 5 },
          populate: {
            path: 'event',
            select: 'title date location'
          }
        });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error: any) {
      logger.error(`Get profile error: ${error.message}`);
      throw error;
    }
  }

  async updateProfile(userId: string, updateData: any): Promise<any> {
    try {
      const allowedUpdates = ['name', 'phoneNumber', 'bio', 'website', 'socialMedia', 'profileImage', 'notificationPreferences'];
      const updates: any = {};
      
      // Filter only allowed updates
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = updateData[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error: any) {
      logger.error(`Update profile error: ${error.message}`);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();
    } catch (error: any) {
      logger.error(`Change password error: ${error.message}`);
      throw error;
    }
  }

  private generateTokens(userId: string, role: string): { token: string; refreshToken: string } {
    // ✅ FIXED: Properly structure the JWT sign calls
    const token = jwt.sign(
      { userId, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any } // Use type assertion to bypass the error
    );

    const refreshToken = jwt.sign(
      { userId, role },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN as any } // Use type assertion to bypass the error
    );

    return { token, refreshToken };
  }

  verifyToken(token: string): { userId: string; role: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      return decoded;
    } catch (error: any) {
      logger.error(`Token verification error: ${error.message}`);
      throw new Error('Invalid or expired token');
    }
  }

  async refreshToken(refreshToken: string): Promise<IAuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as {
        userId: string;
        role: string;
      };

      // Verify user exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const { token, refreshToken: newRefreshToken } = this.generateTokens(user._id.toString(), user.role);

      return {
        success: true,
        message: 'Token refreshed successfully',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
        },
        token,
        refreshToken: newRefreshToken,
      };
    } catch (error: any) {
      logger.error(`Refresh token error: ${error.message}`);
      throw new Error('Invalid refresh token');
    }
  }
}

export const authService = new AuthService();