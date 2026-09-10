import { Router } from 'express';
import { register, login } from '../controllers/authcontroller';
import { createShortUrl, getUserUrls } from '../controllers/urlcontroller';
import { handleRedirect } from '../controllers/redirectcontroller';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/ratelimiter';

const router = Router();

// Auth Routes
router.post('/auth/register', register);
router.post('/auth/login', login);

// Protected URL Shortener Routes
router.post('/urls', authenticateToken, createShortUrl);
router.get('/urls', authenticateToken, getUserUrls);

// Public Redirect Route (dengan Rate Limiting)
router.get('/:shortCode', rateLimiter, handleRedirect);

export default router;