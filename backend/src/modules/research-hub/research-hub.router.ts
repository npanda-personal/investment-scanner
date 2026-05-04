import { Router } from 'express';
import { ResearchHubController } from './research-hub.controller';

const router = Router();
const controller = new ResearchHubController();

router.get('/overview', controller.overview);
router.get('/health', controller.health);

export default router;
