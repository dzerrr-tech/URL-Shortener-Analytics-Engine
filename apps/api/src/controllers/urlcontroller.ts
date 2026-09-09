import { Response } from 'express';
import { nanoid } from 'nanoid';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const createShortUrl = async (req: AuthRequest, res: Response) => {
  const { originalUrl } = req.body;
  const userId = req.userId;

  if (!originalUrl) {
    return res.status(400).json({
        message: "URL asal (originalUrl) wajib diisi."
    });
}

try {
    new URL(originalUrl);
} catch {
    return res.status(400).json({
        message: "originalUrl harus berupa URL yang valid."
    });
}

  const shortCode = nanoid(6); // Generate 6 karakter unik

  try {
    const result = await pool.query(
      'INSERT INTO urls (user_id, original_url, short_code) VALUES ($1, $2, $3) RETURNING *',
      [userId, originalUrl, shortCode]
    );

    return res.status(201).json({
      message: 'URL berhasil diperpendek.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal membuat short URL.' });
  }
};

export const getUserUrls = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      'SELECT id, original_url, short_code, click_count, created_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.json({ data: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil data URL.' });
  }
};