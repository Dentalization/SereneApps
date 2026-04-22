import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    uploadStudy,
    getStudies,
    getStorageStats,
    deleteStudy,
    createStudyShare,
    getSharedStudy,
    validateStudyShareToken,
    createAnnotationSnapshot,
    deleteAnnotationSnapshot,
    getAnnotationSnapshots,
    getStudyAnnotations,
    reviewStudyAnnotations,
    saveStudyAnnotations,
} from '../controllers/xCoreController.js';
import { streamSlice } from '../controllers/xCoreStreamController.js';
import { analyzeStudy } from '../controllers/xCoreAIController.js';

import { authMiddleware } from '../middleware/clinicAuth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Public share routes
router.get('/share/:token', getSharedStudy);
router.get('/share/:token/validate', validateStudyShareToken);

// Routes - Protected by Auth
router.use(authMiddleware);

router.post('/upload', upload.array('files'), uploadStudy);
router.get('/studies', getStudies);
router.post('/studies/:id/share', createStudyShare);
router.get('/studies/:id/annotations', getStudyAnnotations);
router.post('/studies/:id/annotations', express.json({ limit: '2mb' }), saveStudyAnnotations);
router.post('/studies/:id/annotations/review', express.json({ limit: '1mb' }), reviewStudyAnnotations);
router.get('/studies/:id/annotation-snapshots', getAnnotationSnapshots);
router.post('/studies/:id/annotation-snapshots', express.json({ limit: '4mb' }), createAnnotationSnapshot);
router.delete('/studies/:id/annotation-snapshots/:snapshotId', deleteAnnotationSnapshot);
router.get('/stream-slice/:studyId/:viewType/:index', streamSlice);
router.post('/analyze', analyzeStudy);
router.get('/storage', getStorageStats);
router.delete('/studies/:id', deleteStudy);

export default router;
