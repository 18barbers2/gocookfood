import express from 'express';

const app = express();
app.use(express.json());

// Health check route, confirms server is running
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.log('Error starting server', err);
    process.exit(1);
});
