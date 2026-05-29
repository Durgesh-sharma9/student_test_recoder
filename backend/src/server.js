import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'School Daily Test API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/results', resultRoutes);

app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
