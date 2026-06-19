import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import healthRouter from './routes/health.js';
import aiCompleteRouter from './routes/aiComplete.js';
import { registerCollaborationHandlers } from './services/collaborationService.js';

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/ai', aiCompleteRouter);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

registerCollaborationHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});

export { httpServer, io };
