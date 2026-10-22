import express from 'express';

const app = express();
app.use(express.json());

// Health check route, confirms server is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

try {
    const PORT = process.env.port || 3001;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} catch (error) {
    console.log('Error starting server', error);
    process.exit(1);
}
