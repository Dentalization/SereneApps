import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import {
  listEmrRecordsForDentist,
  createEmrRecordForDentist,
  getEmrRecordForDentist,
} from '../services/emrRecords.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRoles(['dentist']));

router.get('/', async (req, res) => {
  try {
    const records = await listEmrRecordsForDentist(req.user.id);
    res.json(records);
  } catch (error) {
    console.error('Failed to list EMR records:', error);
    res.status(500).json({ error: 'Unable to fetch EMR records' });
  }
});

router.get('/:recordId', async (req, res) => {
  try {
    const record = await getEmrRecordForDentist(req.user.id, req.params.recordId);
    if (!record) {
      return res.status(404).json({ error: 'EMR record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Failed to fetch EMR record:', error);
    res.status(500).json({ error: 'Unable to fetch EMR record' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const saved = await createEmrRecordForDentist({
      dentistId: req.user.id,
      payload: req.body,
    });
    res.status(201).json(saved);
  } catch (error) {
    console.error('Failed to create EMR record:', error);
    res.status(500).json({ error: 'Unable to create EMR record' });
  }
});

export default router;
