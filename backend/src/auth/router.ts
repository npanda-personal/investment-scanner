import { Router } from 'express';
import { AuthService } from './service';
import { RegisterRequest, LoginRequest } from '../types/user';

const router = Router();
const authService = new AuthService();

router.post('/register', async (req, res) => {
  try {
    const data: RegisterRequest = req.body;
    const result = await authService.register(data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data: LoginRequest = req.body;
    const result = await authService.login(data);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/me', async (_req, res) => {
  // TODO: implement JWT middleware
  res.status(501).json({ error: 'Not implemented' });
});

export default router;