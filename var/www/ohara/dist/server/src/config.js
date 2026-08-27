import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Deterministically resolve project root by searching upwards for package.json
function resolveProjectRoot(startDir) {
    let current = startDir;
    while (current !== path.dirname(current)) {
        if (fs.existsSync(path.join(current, 'package.json'))) {
            return current;
        }
        current = path.dirname(current);
    }
    return process.cwd();
}
export const PROJECT_ROOT = resolveProjectRoot(__dirname);
dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') });
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
export const config = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_PATH: process.env.DATABASE_PATH ||
        (isTestEnv ? ':memory:' : path.resolve(PROJECT_ROOT, '.data', 'sqlite.db')),
    JWT_SECRET: process.env.JWT_SECRET || 'grande-bibliotheque-super-secret-key-2026-collective',
    COOKIE_SECRET: process.env.COOKIE_SECRET || 'grande-bibliotheque-cookie-signer-secret-2026',
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    PROJECT_ROOT,
};
