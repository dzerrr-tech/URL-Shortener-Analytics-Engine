import { Router } from 'express';
import { register, login } from '../controllers/authcontroller';
import {
  createShortUrl,
  getUserUrls,
  deleteUrl,
  toggleUrlActive,
  getUrlAnalytics,
} from '../controllers/urlcontroller';
import { handleRedirect } from '../controllers/redirectcontroller';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/ratelimiter';

const router = Router();

// Auth Routes (rate-limited biar tidak brute-force)
router.post('/auth/register', rateLimiter, register);
router.post('/auth/login', rateLimiter, login);

// Protected URL Shortener Routes
router.post('/urls', authenticateToken, createShortUrl);
router.get('/urls', authenticateToken, getUserUrls);
router.delete('/urls/:id', authenticateToken, deleteUrl);
router.patch('/urls/:id/toggle', authenticateToken, toggleUrlActive);
router.get('/urls/:id/analytics', authenticateToken, getUrlAnalytics);

// Public Redirect Route (dengan Rate Limiting)
router.get('/:shortCode', rateLimiter, handleRedirect);

export default router;