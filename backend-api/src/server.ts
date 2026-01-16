import express from 'express';
import cors from 'cors';
import marketsRouter from './routes/markets';

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/markets', marketsRouter);

export default app;
