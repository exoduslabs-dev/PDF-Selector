import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple file watcher that rebuilds the frontend when files in src/ change.
const watchDir = path.join(__dirname, '..', 'src');
let timer = null;
const debounceMs = 300;
let running = false;

function runBuild() {
  if (running) return;
  running = true;
  console.log('🔧 Running build...');
  const build = exec('npm run build', { cwd: path.join(__dirname, '..') });

  build.stdout.pipe(process.stdout);
  build.stderr.pipe(process.stderr);

  build.on('exit', (code) => {
    running = false;
    console.log(`🔨 Build finished with code ${code}`);
  });
}

// Initial build
runBuild();

function scheduleBuild() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(runBuild, debounceMs);
}

// Recursively watch directory
function watchRecursive(dir) {
  fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
    if (err) return console.error('Watcher read error', err);
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        watchRecursive(full);
      }
    }
  });

  try {
    const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
      // Ignore temporary editor files and node_modules
      if (!filename) return;
      if (filename.endsWith('~') || filename.startsWith('.') || dir.includes('node_modules')) return;
      console.log(`📄 Change detected: ${path.join(dir, filename)} (${eventType})`);
      scheduleBuild();
    });

    watcher.on('error', (e) => console.error('Watcher error', e));
  } catch (e) {
    console.error('Failed to watch', dir, e);
  }
}

watchRecursive(watchDir);

console.log(`👀 Watching ${watchDir} for changes. Builds will run automatically.`);
