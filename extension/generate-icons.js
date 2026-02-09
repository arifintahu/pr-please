
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const icons = {
  'icon16.png': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAA1JREFUOE9j/P///38ACfsD/QjR6B4AAAAASUVORK5CYII=',
  'icon48.png': 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAA1JREFUaEPt0wEBAAAAgqD/r26IBAAAAAAAAE4N1AAAAT4v4OQAAAAASUVORK5CYII=',
  'icon128.png': 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAA1JREFUeF7t0wEBAAAAgqD/r26IBAAAAAAAAADg1QA9AAAB005c2AAAAABJRU5ErkJggg=='
};

const iconDir = path.join(__dirname, 'public/icons');

if (!fs.existsSync(iconDir)){
    fs.mkdirSync(iconDir, { recursive: true });
}

for (const [filename, base64] of Object.entries(icons)) {
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(path.join(iconDir, filename), buffer);
  console.log(`Created ${filename}`);
}
