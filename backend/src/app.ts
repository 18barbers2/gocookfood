import express from 'express';
import authRouter from './routes/auth.js';

export const app = express();
app.use(express.json());
app.use('/auth', authRouter);

// Health check route, confirms server is running
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
