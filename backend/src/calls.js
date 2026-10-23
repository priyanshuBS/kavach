// Loads the role-played call scripts from data/calls/*.json.
// They are used by the app's Demo mode and by the evaluation script.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'calls');

export function loadCalls() {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
}
