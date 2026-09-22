import { Response } from 'express';
import { nanoid } from 'nanoid';
import { pool } from '../config/db';
import { redis } from '../config/redis';
import { AuthRequest } from '../middleware/auth';

const RESERVED_CODES = ['urls', 'auth', 'health'];

export const createShortUrl = async (req: AuthRequest, res: Response) => {
  const { originalUrl, customAlias, expiresAt } = req.body;
  const userId = req.userId;

  if (!originalUrl) {
    return res.status(400).json({ message: 'URL asal (originalUrl) wajib diisi.' });
  }

  try {
    new URL(originalUrl);
  } catch {
    return res.status(400).json({ message: 'originalUrl harus berupa URL yang valid.' });
  }

  if (customAlias && (!/^[a-zA-Z0-9_-]{3,20}$/.test(customAlias) || RESERVED_CODES.includes(customAlias))) {
    return res.status(400).json({ message: 'Alias harus 3-20 karakter alfanumerik (boleh - dan _).' });
  }

  const shortCode = customAlias || nanoid(6);

  try {
    const exists = await pool.query('SELECT id FROM urls WHERE short_code = $1', [shortCode]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Alias ini sudah dipakai, coba yang lain.' });
    }

    const result = await pool.query(
      `INSERT INTO urls (user_id, original_url, short_code, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, originalUrl, shortCode, expiresAt || null]
    );

    return res.status(201).json({ message: 'URL berhasil diperpendek.', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal membuat short URL.' });
  }
};

export const getUserUrls = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT id, original_url, short_code, click_count, is_active, expires_at, created_at
       FROM urls WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const count = await pool.query('SELECT COUNT(*) FROM urls WHERE user_id = $1', [userId]);

    return res.json({
      data: result.rows,
      pagination: { page, limit, total: Number(count.rows[0].count) },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil data URL.' });
  }
};

const findOwnedUrl = async (id: string, userId?: string) => {
  const result = await pool.query('SELECT * FROM urls WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0];
};

export const deleteUrl = async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const url = await findOwnedUrl(id, req.userId);
    if (!url) return res.status(404).json({ message: 'URL tidak ditemukan.' });

    await pool.query('DELETE FROM urls WHERE id = $1', [id]);
    await redis.del(`url:${url.short_code}`);

    return res.json({ message: 'URL berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal menghapus URL.' });
  }
};

export const toggleUrlActive = async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const url = await findOwnedUrl(id, req.userId);
    if (!url) return res.status(404).json({ message: 'URL tidak ditemukan.' });

    const result = await pool.query(
      'UPDATE urls SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [id]
    );
    await redis.del(`url:${url.short_code}`);

    return res.json({ message: 'Status URL diperbarui.', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengubah status URL.' });
  }
};

export const getUrlAnalytics = async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const url = await findOwnedUrl(id, req.userId);
    if (!url) return res.status(404).json({ message: 'URL tidak ditemukan.' });

    const totalClicks = await pool.query(
      'SELECT COUNT(*)::int AS total FROM clicks WHERE url_id = $1', [id]
    );

    const clicksByDay = await pool.query(
      `SELECT DATE(clicked_at) AS date, COUNT(*)::int AS count
       FROM clicks WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '14 days'
       GROUP BY DATE(clicked_at) ORDER BY date ASC`,
      [id]
    );

    const byDevice = await pool.query(
      `SELECT COALESCE(device_type, 'unknown') AS device_type, COUNT(*)::int AS count
       FROM clicks WHERE url_id = $1 GROUP BY device_type ORDER BY count DESC`,
      [id]
    );

    const byReferrer = await pool.query(
      `SELECT COALESCE(NULLIF(referrer, ''), 'Direct / Unknown') AS referrer, COUNT(*)::int AS count
       FROM clicks WHERE url_id = $1 GROUP BY referrer ORDER BY count DESC LIMIT 5`,
      [id]
    );

    return res.json({
      data: {
        url: { shortCode: url.short_code, originalUrl: url.original_url },
        totalClicks: totalClicks.rows[0].total,
        clicksByDay: clicksByDay.rows,
        byDevice: byDevice.rows,
        byReferrer: byReferrer.rows,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil data analytics.' });
  }
};