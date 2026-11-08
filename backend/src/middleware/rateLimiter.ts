import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // max requests per IP per window
    standardHeaders: true, // tells clients their remaining quota
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});
