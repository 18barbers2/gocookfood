import express from 'express';
import authRouter from './routes/auth.js';
import cookieParser from 'cookie-parser';
import { authLimiter } from './middleware/rateLimiter.js';
import recipeRouter from './routes/recipe.js';

export const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/recipe', authLimiter, recipeRouter);

// Health check route, confirms server is running
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
