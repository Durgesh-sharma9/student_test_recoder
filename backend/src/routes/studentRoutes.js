import { Router } from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  checkRollConflicts,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';
import multer from 'multer';
import { generateStudentImportTemplate } from '../services/excelService.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(protect, requireSchoolActive);

router.get('/', getStudents);
router.get('/download-template', authorize('school_admin'), async (req, res) => {
  try {
    const buffer = await generateStudentImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
});
router.get('/:id', getStudent);

router.post('/', authorize('school_admin'), createStudent);
router.post('/bulk-import', authorize('school_admin'), upload.single('file'), bulkImportStudents);
router.post('/check-roll-conflicts', authorize('school_admin'), checkRollConflicts);
router.put('/:id', authorize('school_admin'), updateStudent);
router.delete('/:id', authorize('school_admin'), deleteStudent);

export default router;
