import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.promises.setServers(['8.8.8.8']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function parseMongoJSON(key, value) {
  // Restore MongoDB ObjectId and Date types from exported JSON
  if (value && typeof value === 'object') {
    if (value.$oid) return new mongoose.Types.ObjectId(value.$oid);
    if (value.$date) return new Date(value.$date);
  }
  // Check if string matches ISO Date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

async function restoreBackup() {
  const backupsBase = path.resolve(__dirname, '../backups');

  if (!fs.existsSync(backupsBase)) {
    console.error('❌ No backups folder found!');
    process.exit(1);
  }

  // Find latest backup folder or use user provided one
  const targetArg = process.argv[2];
  let targetFolder = '';

  if (targetArg) {
    targetFolder = path.isAbsolute(targetArg) ? targetArg : path.join(backupsBase, targetArg);
  } else {
    const folders = fs.readdirSync(backupsBase)
      .filter(f => fs.statSync(path.join(backupsBase, f)).isDirectory())
      .sort()
      .reverse();

    if (folders.length === 0) {
      console.error('❌ No backup folders found inside backend/backups!');
      process.exit(1);
    }
    targetFolder = path.join(backupsBase, folders[0]);
  }

  console.log(`🔄 Connecting to MongoDB to restore backup from:`);
  console.log(`📁 ${targetFolder}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const files = fs.readdirSync(targetFolder).filter(f => f.endsWith('.json'));

  let totalRestored = 0;

  for (const file of files) {
    const colName = file.replace('.json', '');
    const content = fs.readFileSync(path.join(targetFolder, file), 'utf-8');
    const docs = JSON.parse(content, parseMongoJSON);

    if (Array.isArray(docs) && docs.length > 0) {
      const is24Hex = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
      const convertDoc = (d) => {
        if (!d || typeof d !== 'object') return d;
        for (const k of Object.keys(d)) {
          const v = d[k];
          if (is24Hex(v) && (k === '_id' || k === 'school' || k === 'class' || k === 'student' || k === 'user' || k === 'academicSession' || k === 'session' || k === 'plan' || k === 'parent' || k.endsWith('Id'))) {
            d[k] = new mongoose.Types.ObjectId(v);
          } else if (Array.isArray(v)) {
            d[k] = v.map(item => is24Hex(item) ? new mongoose.Types.ObjectId(item) : (item && typeof item === 'object' ? convertDoc(item) : item));
          } else if (v && typeof v === 'object' && !(v instanceof mongoose.Types.ObjectId) && !(v instanceof Date)) {
            d[k] = convertDoc(v);
          }
        }
        return d;
      };

      const processedDocs = docs.map(doc => convertDoc({ ...doc }));

      const col = db.collection(colName);
      await col.deleteMany({}); // replace collection content with backup
      await col.insertMany(processedDocs);
      console.log(`✓ Restored ${colName.padEnd(25)} : ${processedDocs.length} records`);
      totalRestored += processedDocs.length;
    }
  }

  console.log('\n=======================================');
  console.log(`🎉 RESTORE COMPLETED SUCCESSFULLY!`);
  console.log(`Total Records Restored: ${totalRestored}`);
  console.log('Database is now restored to this backup point.');
  console.log('=======================================');

  await mongoose.disconnect();
}

restoreBackup().catch(console.error);
