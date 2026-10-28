import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.log('Error starting server', err);
    process.exit(1);
});
