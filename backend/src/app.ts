import express from 'express';
import authRouter from './routes/auth.js';
import cookieParser from 'cookie-parser';

export const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use(cookieParser());

// Health check route, confirms server is running
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
