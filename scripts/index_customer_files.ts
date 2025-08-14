import { readdir, stat } from 'fs/promises';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ROOT_DIR = '/Volumes/Archives/Next-Label/database';

async function getAllFiles(dir: string): Promise<string[]> {
  let files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const client = new Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});
  await client.connect();

  const files = await getAllFiles(ROOT_DIR);
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const stats = await stat(filePath);
    const uploadedAt = stats.birthtime;

    // Check if file already exists in DB
 // Insert new file record, skip if already exists
const result = await client.query(
  'INSERT INTO customer_file_index (id, fileName, fileLocation, uploadedAt) VALUES (gen_random_uuid(), $1, $2, $3) ON CONFLICT DO NOTHING',
  [fileName, filePath, uploadedAt]
);
if (result.rowCount === 1) {
  console.log(`Indexed: ${filePath}`);
} else {
  console.log(`Already indexed: ${filePath}`);
}
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
