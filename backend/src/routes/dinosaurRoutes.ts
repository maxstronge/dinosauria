import express from 'express';
import { getAllDinosaurs, getAllTaxa } from '../controllers/dinosaurController'; // 

const router = express.Router();

router.get('/dinosaurs', getAllDinosaurs);
router.get('/taxa', getAllTaxa);

export default router;