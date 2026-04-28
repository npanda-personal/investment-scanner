import express from 'express';
import dataRouter from './data.router';
import stocksRouter from './stocks.router';

const router = express.Router();

router.use('/data', dataRouter);
router.use('/stocks', stocksRouter);

export default router;
