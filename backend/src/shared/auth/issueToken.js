import jwt from 'jsonwebtoken';
import { config } from '../kernel/config.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--userId') args.userId = argv[i + 1];
    if (a === '--role') args.role = argv[i + 1];
    if (a === '--expiresIn') args.expiresIn = argv[i + 1];
  }
  return args;
}

const { userId, role, expiresIn } = parseArgs(process.argv.slice(2));

if (!userId) {
  throw new Error('Usage: npm run issue-token -- --userId <uuid> [--role <string>] [--expiresIn <e.g. 8h>]');
}

const token = jwt.sign(
  {
    sub: userId,
    role: role || null
  },
  config.jwt.secret,
  {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: expiresIn || '8h'
  }
);

process.stdout.write(token + '\n');
