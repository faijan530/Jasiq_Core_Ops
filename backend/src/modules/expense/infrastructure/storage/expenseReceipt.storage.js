import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { badRequest } from '../../../../shared/kernel/errors.js';

function assertContentType(contentType) {
  const ct = String(contentType || '').trim().toLowerCase();
  const allowed = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];
  if (!allowed.includes(ct)) throw badRequest('Invalid receipt content type');
  return ct;
}

function decodeBase64(base64) {
  const raw = String(base64 || '').trim();
  if (!raw) throw badRequest('fileBase64 is required');

  const match = raw.match(/^data:([^;]+);base64,(.*)$/i);
  const data = match ? match[2] : raw;

  try {
    return Buffer.from(data, 'base64');
  } catch {
    throw badRequest('Invalid fileBase64');
  }
}

function safeFileBaseName(name) {
  return String(name || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

export async function storeExpenseReceipt({ expenseId, fileName, contentType, fileBase64 }) {
  const ct = assertContentType(contentType);
  const buf = decodeBase64(fileBase64);

  const maxBytes = 5 * 1024 * 1024;
  if (buf.length <= 0) throw badRequest('Invalid receipt file');
  if (buf.length > maxBytes) throw badRequest('Receipt too large');

  const ext = ct === 'application/pdf' ? 'pdf' : ct === 'image/png' ? 'png' : 'jpg';

  const relDir = path.join('storage', 'expense_receipts', String(expenseId));
  const base = safeFileBaseName(path.parse(String(fileName || 'receipt')).name);
  const rand = crypto.randomUUID();
  const relFile = path.join(relDir, `${base}_${rand}.${ext}`);
  const absFile = path.resolve(process.cwd(), relFile);

  await fs.mkdir(path.dirname(absFile), { recursive: true });
  await fs.writeFile(absFile, buf);

  return {
    storageKey: `expense_receipts/${expenseId}/${base}_${rand}.${ext}`,
    fileSize: buf.length,
    relPath: relFile.replace(/\\/g, '/')
  };
}

export async function readExpenseReceiptFromStorage({ relPath }) {
  const abs = path.resolve(process.cwd(), relPath);
  return fs.readFile(abs);
}
