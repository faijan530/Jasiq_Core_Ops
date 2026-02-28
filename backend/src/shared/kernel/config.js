import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  security: {
    enforcementLevel: process.env.SECURITY_ENFORCEMENT_LEVEL || 'STRICT',
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '20m',
    refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'jasiq_refresh',
    refreshCookieSecure: process.env.REFRESH_COOKIE_SECURE || '',
    refreshCookieSameSite: process.env.REFRESH_COOKIE_SAMESITE || 'lax'
  },
  jwt: {
    issuer: process.env.JWT_ISSUER || 'jasiq-coreops',
    audience: process.env.JWT_AUDIENCE || 'jasiq-coreops-web',
    secret: process.env.JWT_SECRET
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 120)
  }
};

if (!config.jwt.secret) {
  throw new Error('JWT_SECRET is required');
}
