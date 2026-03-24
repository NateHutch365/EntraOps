import { Router } from 'express';
import { getRecentPrivilegedEAMCommits } from '../services/gitLog.js';

const router = Router();

// GET /api/git/recent — last 5 commits touching PrivilegedEAM/
// gitLog service returns [] (not throws) if git unavailable
router.get('/recent', async (_req, res) => {
  const commits = await getRecentPrivilegedEAMCommits(5);
  res.json({ commits });
});

export { router as gitRouter };
