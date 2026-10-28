import express from 'express';

export const app = express();
app.use(express.json());

// Health check route, confirms server is running
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
