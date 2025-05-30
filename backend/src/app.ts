import express from 'express';
import cors from 'cors';
import trackingSequenceRouter from './routes/trackingSequence';
import localCoversRouter from './routes/localCovers';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', trackingSequenceRouter);
app.use('/api/covers', localCoversRouter);

export default app; 