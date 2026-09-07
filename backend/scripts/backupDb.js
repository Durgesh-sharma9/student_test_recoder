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

async function takeBackup() {
  console.log('🔄 Connecting to MongoDB to take backup...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
  const backupFolder = path.resolve(__dirname, `../backups/backup_${dateStr}_${timeStr}`);

  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const collections = await db.listCollections().toArray();
  console.log(`📁 Saving backup to: ${backupFolder}\n`);

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

  console.log('\n=======================================');
  console.log(`🎉 BACKUP SUCCESSFUL!`);
  console.log(`Total Collections Backed Up: ${totalCollections}`);
  console.log(`Total Records Backed Up: ${totalDocs}`);
  console.log(`Folder: ${backupFolder}`);
  console.log('=======================================');

  await mongoose.disconnect();
}

takeBackup().catch(console.error);
