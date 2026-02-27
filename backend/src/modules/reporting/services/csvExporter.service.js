import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { badRequest } from '../../../shared/kernel/errors.js';

function safeBase(name) {
  return String(name || 'report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv({ headers, rows }) {
  const h = (headers || []).map(csvEscape).join(',');
  const lines = [h];
  for (const r of rows || []) {
    lines.push((r || []).map(csvEscape).join(','));
  }
  return lines.join('\n') + '\n';
}

export async function storeCsvTemp({ fileBaseName, csvText }) {
  if (!csvText) throw badRequest('CSV is empty');

  const relDir = path.join('storage', 'report_exports');
  const base = safeBase(fileBaseName);
  const rand = crypto.randomUUID();
  const fileName = `${base}_${rand}.csv`;
  const relPath = path.join(relDir, fileName);
  const absPath = path.resolve(process.cwd(), relPath);

  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, csvText, 'utf8');

  return {
    fileName,
    relPath: relPath.replace(/\\/g, '/'),
    sizeBytes: Buffer.byteLength(csvText, 'utf8')
  };
}
