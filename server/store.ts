import fs from 'fs';
import path from 'path';
import type { ActivityItem, Product } from '../shared/types.ts';
import { createSeedActivities, createSeedProducts } from './seedData.ts';

interface StoreState {
  products: Product[];
  activities: ActivityItem[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smartstock-db.json');

let cachedState: StoreState | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveToDisk(state: StoreState) {
  ensureDir();
  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
}

export function loadStore(): StoreState {
  if (cachedState) {
    return cachedState;
  }

  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreState;
      if (Array.isArray(parsed.products) && Array.isArray(parsed.activities)) {
        cachedState = parsed;
        return cachedState;
      }
    } catch (err) {
      console.error('Failed to parse store JSON, re-seeding:', err);
    }
  }

  const seeded: StoreState = {
    products: createSeedProducts(),
    activities: createSeedActivities(),
  };
  cachedState = seeded;
  saveToDisk(seeded);
  return seeded;
}

export function persistStore(state: StoreState): StoreState {
  cachedState = state;
  saveToDisk(state);
  return state;
}

export function addActivity(
  state: StoreState,
  entry: Omit<ActivityItem, 'id' | 'timestamp'>
): ActivityItem {
  const item: ActivityItem = {
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  state.activities = [item, ...state.activities].slice(0, 60);
  return item;
}
