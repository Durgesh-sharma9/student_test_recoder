import { Router } from 'express';
import multer from 'multer';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  assignTeacherWorkload,
  bulkImportTeachers,
  resendTeacherCredentials,
} from '../controllers/userController.js';
import { generateTeacherImportTemplate } from '../services/excelService.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSchoolActive } from '../middleware/tenant.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(protect, requireSchoolActive);

router.get('/', getUsers);
router.post('/', authorize('school_admin'), createUser);
router.post('/bulk-import', authorize('school_admin'), upload.single('file'), bulkImportTeachers);
router.get('/download-template', authorize('school_admin'), async (req, res) => {
  try {
    const buffer = await generateTeacherImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=teacher_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
});
router.put('/:id/assignments', authorize('school_admin'), assignTeacherWorkload);
router.post('/:id/resend-credentials', authorize('school_admin'), resendTeacherCredentials);
router.route('/:id').get(authorize('school_admin'), getUser).put(authorize('school_admin'), updateUser).delete(authorize('school_admin'), deleteUser);

export default router;
