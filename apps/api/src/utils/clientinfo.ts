import crypto from 'crypto';

export const hashIp = (ip: string): string => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

export const detectDeviceType = (userAgent: string = ''): string => {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
};