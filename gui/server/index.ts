import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { securityMiddleware, errorHandler } from './middleware/security.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const CLIENT_BUILD = path.resolve(import.meta.dirname, '../client/dist');

app.use(helmet());
app.use(express.json());
app.use(securityMiddleware);

// Routes will be registered here in Plan 04
// app.use('/api/dashboard', dashboardRouter);
// app.use('/api/objects', objectsRouter);
// app.use('/api/git', gitRouter);

// Serve client build in production
app.use(express.static(CLIENT_BUILD));
// Express v5 wildcard — MUST use /{*splat} not /* (/* crashes v5)
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
});

// 4-arg error handler last
app.use(errorHandler);

// MUST pass '127.0.0.1' — without it, binds to 0.0.0.0 (all interfaces)
app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`EntraOps GUI server running at http://127.0.0.1:${PORT}`);
});

export { app };
