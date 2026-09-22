import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { pool } from '../config/db';
import { hashIp, detectDeviceType } from '../utils/clientinfo';

const recordClick = (urlId: string, req: Request) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const userAgent = String(req.headers['user-agent'] || '');
  const referrer = (req.headers['referer'] || req.headers['referrer'] || null) as string | null;

  pool.query(
    `INSERT INTO clicks (url_id, ip_hash, user_agent, referrer, device_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [urlId, hashIp(ip), userAgent, referrer, detectDeviceType(userAgent)]
  ).catch((err) => console.error('Gagal mencatat klik:', err));

  pool.query('UPDATE urls SET click_count = click_count + 1 WHERE id = $1', [urlId])
    .catch((err) => console.error('Gagal update click_count:', err));
};

export const handleRedirect = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  try {
    const cached = await redis.get(`url:${shortCode}`);

    if (cached) {
      const { id, originalUrl } = JSON.parse(cached);
      recordClick(id, req);
      return res.redirect(302, originalUrl);
    }

    const result = await pool.query(
      'SELECT id, original_url, is_active, expires_at FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'URL tidak ditemukan.' });
    }

    const url = result.rows[0];

    if (!url.is_active) {
      return res.status(410).json({ message: 'URL ini sudah dinonaktifkan.' });
    }

    if (url.expires_at && new Date(url.expires_at) < new Date()) {
      return res.status(410).json({ message: 'URL ini sudah kedaluwarsa.' });
    }

    await redis.set(
      `url:${shortCode}`,
      JSON.stringify({ id: url.id, originalUrl: url.original_url }),
      'EX',
      86400
    );

    recordClick(url.id, req);
    return res.redirect(302, url.original_url);
  } catch (error) {
    console.error('Redirect Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};