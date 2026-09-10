import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { pool } from '../config/db';

export const handleRedirect = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  try {
    // 1. Cek dari Cache Redis terlebih dahulu (Cache Hit)
    const cachedUrl = await redis.get(`url:${shortCode}`);

    if (cachedUrl) {
      // Async: Tambah hit count di PostgreSQL tanpa menunggu response (Non-blocking)
      pool.query('UPDATE urls SET click_count = click_count + 1 WHERE short_code = $1', [shortCode])
        .catch(err => console.error('Error updating click count:', err));

      return res.redirect(302, cachedUrl);
    }

    // 2. Jika tidak ada di Cache (Cache Miss), Query ke PostgreSQL
    const result = await pool.query(
      'SELECT id, original_url FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'URL tidak ditemukan.' });
    }

    const originalUrl = result.rows[0].original_url;

    // 3. Simpan ke Redis Cache (Expire dalam 24 Jam = 86400 detik)
    await redis.set(`url:${shortCode}`, originalUrl, 'EX', 86400);

    // 4. Update click count
    await pool.query('UPDATE urls SET click_count = click_count + 1 WHERE short_code = $1', [shortCode]);

    // 5. Redirect user ke URL Asli
    return res.redirect(302, originalUrl);
  } catch (error) {
    console.error('Redirect Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};