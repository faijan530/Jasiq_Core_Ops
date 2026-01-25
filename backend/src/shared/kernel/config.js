import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
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
