import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { securityMiddleware, errorHandler } from './middleware/security.js';
import { dashboardRouter } from './routes/dashboard.js';
import { objectsRouter } from './routes/objects.js';
import { gitRouter } from './routes/git.js';
import { templatesRouter } from './routes/templates.js';
import { commandsRouter } from './routes/commands.js';
import { connectRouter } from './routes/connect.js';
import { configRouter } from './routes/config.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const CLIENT_BUILD = path.resolve(import.meta.dirname, '../client/dist');

app.use(helmet());
app.use(express.json());
app.use(securityMiddleware);

app.use('/api/dashboard', dashboardRouter);
app.use('/api/objects', objectsRouter);
app.use('/api/git', gitRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/connect', connectRouter);
app.use('/api/config', configRouter);

// Serve client build in production only — in dev, Vite (port 5173) handles the client
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_BUILD));
  // Express v5 wildcard — MUST use /{*splat} not /* (/* crashes v5)
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
  });
}

// 4-arg error handler last
app.use(errorHandler);

// MUST pass '127.0.0.1' — without it, binds to 0.0.0.0 (all interfaces)
app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`EntraOps GUI server running at http://127.0.0.1:${PORT}`);
});

export { app };
