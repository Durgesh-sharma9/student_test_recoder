import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dns from 'dns';
import nodemailer from 'nodemailer';
import { ZipArchive } from 'archiver';

dns.promises.setServers(['8.8.8.8']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function zipFolder(sourceFolder, outZipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outZipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => resolve(output.bytesWritten));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceFolder, false);
    archive.finalize();
  });
}

async function sendBackupEmail(zipFilePath, zipFileName, dateStr, timeStr, totalDocs, totalCollections) {
  const recipient = process.env.BACKUP_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'webncodetechnologies@gmail.com';

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️ SMTP not fully configured in .env. Skipping email sending.');
    return;
  }

  console.log(`📧 Sending backup zip to email: ${recipient}...`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"TestMaster Backup" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
    to: recipient,
    subject: `📦 Database Backup: ${dateStr} (${totalDocs} records)`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #2563eb;">📦 TestMaster Database Backup Report</h2>
        <p>A fresh database backup was successfully created and is attached to this email.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 450px; margin: 15px 0;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: bold;">Date & Time:</td>
            <td style="padding: 8px 12px;">${dateStr} at ${timeStr.replace(/-/g, ':')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: bold;">Total Collections:</td>
            <td style="padding: 8px 12px;">${totalCollections}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: bold;">Total Records:</td>
            <td style="padding: 8px 12px; color: #16a34a; font-weight: bold;">${totalDocs} records</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: bold;">Backup File:</td>
            <td style="padding: 8px 12px;">${zipFileName}</td>
          </tr>
        </table>
        <p style="font-size: 13px; color: #64748b;">
          💡 <i>Keep this zip file safe. In case of any data loss, this backup can be restored anytime using: <code>npm run restore</code>.</i>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: zipFileName,
        path: zipFilePath,
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✓ Email sent successfully to ${recipient} (Message ID: ${info.messageId})`);
}

async function takeBackup() {
  console.log('🔄 Connecting to MongoDB to take backup...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const backupFolder = path.resolve(__dirname, `../backups/backup_${dateStr}_${timeStr}`);

  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const collections = await db.listCollections().toArray();
  console.log(`📁 Saving backup locally to: ${backupFolder}\n`);

  let totalCollections = 0;
  let totalDocs = 0;

  for (const col of collections) {
    const colName = col.name;
    const docs = await db.collection(colName).find({}).toArray();

    if (docs.length > 0) {
      const filePath = path.join(backupFolder, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      console.log(`✓ Exported ${colName.padEnd(25)} : ${docs.length} records`);
      totalCollections++;
      totalDocs += docs.length;
    }
  }

  // Create Zip
  const zipFileName = `backup_${dateStr}_${timeStr}.zip`;
  const zipFilePath = path.join(path.resolve(__dirname, '../backups'), zipFileName);
  console.log(`\n🗜️ Compressing backup into: ${zipFileName}...`);
  const bytes = await zipFolder(backupFolder, zipFilePath);
  console.log(`✓ Zip created (${(bytes / 1024).toFixed(1)} KB)`);

  // Send Email with Zip attached
  try {
    await sendBackupEmail(zipFilePath, zipFileName, dateStr, timeStr, totalDocs, totalCollections);
  } catch (emailErr) {
    console.error('❌ Failed to send backup email:', emailErr.message);
    console.log('ℹ️ Local backup is still safely saved in the backups folder.');
  }

  console.log('\n=======================================');
  console.log(`🎉 BACKUP COMPLETE & EMAIL SENT!`);
  console.log(`Total Collections Backed Up : ${totalCollections}`);
  console.log(`Total Records Backed Up     : ${totalDocs}`);
  console.log(`Local Folder Location       : ${backupFolder}`);
  console.log(`Local Zip File              : ${zipFilePath}`);
  console.log(`Sent to Email               : ${process.env.BACKUP_EMAIL || 'webncodetechnologies@gmail.com'}`);
  console.log('=======================================');

  await mongoose.disconnect();
}

takeBackup().catch(console.error);
