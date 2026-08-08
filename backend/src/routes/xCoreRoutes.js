import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import {
    assignStudyPatient,
    uploadStudy,
    getStudies,
    getClinicStudies,
    getStorageStats,
    deleteStudy,
    createStudyShare,
    getEligibleStudyShareDentists,
    getSharedStudy,
    validateStudyShareToken,
    createAnnotationSnapshot,
    deleteAnnotationSnapshot,
    getAnnotationSnapshots,
    getStudyAnnotations,
    getSeriesInstances,
    reviewStudyAnnotations,
    saveStudyAnnotations,
    deleteBenchmarkStudy,
    benchmarkCallback,
} from '../controllers/xCoreController.js';
import { streamSlice } from '../controllers/xCoreStreamController.js';
import { analyzeStudy } from '../controllers/xCoreAIController.js';
import {
    createCase,
    deleteCase,
    downloadReport,
    generateReport,
    getCase,
    listCases,
    preflightReport,
    saveCaseRender,
    updateCase,
} from '../controllers/xCoreAnalysisCaseController.js';

import { authMiddleware, requireRoles } from '../middleware/clinicAuth.js';

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

const benchmarkModeEnabled = process.env.XCORE_BENCHMARK_MODE === 'true';

if (benchmarkModeEnabled) {
    // Internal benchmark callback. This route does not exist in normal runtime.
    router.post('/benchmark/callback', express.json(), benchmarkCallback);
}

// Routes - Protected by Auth
router.use(authMiddleware);

router.post('/upload', requireRoles(['dentist']), upload.array('files'), uploadStudy);
router.get('/studies', getStudies);
router.get('/clinic/studies', getClinicStudies);
router.get('/studies/:id/share/eligible-dentists', getEligibleStudyShareDentists);
router.post('/studies/:id/share', createStudyShare);
router.patch(
    '/studies/:id/patient',
    requireRoles(['dentist']),
    express.json(),
    assignStudyPatient,
);
router.get('/studies/:studyId/series/:seriesUid/instances', getSeriesInstances);
router.get('/studies/:id/annotations', getStudyAnnotations);
router.post('/studies/:id/annotations', express.json({ limit: '2mb' }), saveStudyAnnotations);
router.post('/studies/:id/annotations/review', express.json({ limit: '1mb' }), reviewStudyAnnotations);
router.get('/studies/:id/annotation-snapshots', getAnnotationSnapshots);
router.post('/studies/:id/annotation-snapshots', express.json({ limit: '4mb' }), createAnnotationSnapshot);
router.delete('/studies/:id/annotation-snapshots/:snapshotId', deleteAnnotationSnapshot);
router.get('/stream-slice/:studyId/:viewType/:index', streamSlice);
router.post('/analyze', analyzeStudy);
router.get('/analysis-cases', listCases);
router.post('/analysis-cases', express.json({ limit: '4mb' }), createCase);
router.get('/analysis-cases/:caseId', getCase);
router.put('/analysis-cases/:caseId', express.json({ limit: '4mb' }), updateCase);
router.delete('/analysis-cases/:caseId', deleteCase);
router.put('/analysis-cases/:caseId/items/:itemId/render', express.json({ limit: '40mb' }), saveCaseRender);
router.get('/analysis-cases/:caseId/reports/preflight', preflightReport);
router.post('/analysis-cases/:caseId/reports', express.json({ limit: '1mb' }), generateReport);
router.get('/analysis-cases/:caseId/reports/:reportId/pdf', downloadReport);
router.get('/storage', getStorageStats);
router.delete('/studies/:id', deleteStudy);

if (benchmarkModeEnabled) {
    router.delete('/benchmark/studies/:id', deleteBenchmarkStudy);
}

export default router;
