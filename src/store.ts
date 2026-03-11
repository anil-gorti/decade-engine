import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { UserProfile, ActionRecord, CheckIn } from "./types.js";
import { TEST_USERS } from "./test-user.js";
import { today } from "./util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function userPath(userName: string): string {
  return path.join(DATA_DIR, `${userName}.json`);
}

/**
 * Load a user profile from disk.
 * If no file exists yet, seed it from the test-user defaults.
 */
export async function loadProfile(userName: string): Promise<UserProfile> {
  await ensureDataDir();
  const filePath = userPath(userName);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as UserProfile;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  const seed = TEST_USERS[userName as keyof typeof TEST_USERS];
  if (!seed) throw new Error(`Unknown user: ${userName}`);

  await saveProfile(userName, seed);
  return structuredClone(seed);
}

/**
 * Save a user profile to disk.
 * Uses atomic write (write to tmp, then rename) to prevent corruption.
 */
export async function saveProfile(userName: string, profile: UserProfile): Promise<void> {
  await ensureDataDir();
  const target = userPath(userName);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(profile, null, 2));
  await fs.rename(tmp, target);
}

/**
 * List all known user names — merges test defaults with any on-disk profiles.
 */
export async function listUsers(): Promise<string[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const onDisk = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));

  const testKeys = Object.keys(TEST_USERS);
  const merged = new Set([...testKeys, ...onDisk]);
  return [...merged];
}

/**
 * Check if the user already has an action recorded for today.
 */
export async function hasActionToday(userName: string): Promise<boolean> {
  try {
    const profile = await loadProfile(userName);
    return profile.action_history.some((a) => a.date === today());
  } catch {
    return false;
  }
}

const locks = new Map<string, Promise<void>>();

function withLock<T>(userName: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(userName) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(userName, next.then(() => { }, () => { }));
  return next;
}

/**
 * Append an action to the user's history and save.
 */
export function recordAction(userName: string, action: ActionRecord): Promise<void> {
  return withLock(userName, async () => {
    const profile = await loadProfile(userName);
    profile.action_history.push(action);
    await saveProfile(userName, profile);
  });
}

/**
 * Append a check-in to the user's recent check-ins and save.
 */
export function recordCheckIn(userName: string, checkIn: CheckIn): Promise<void> {
  return withLock(userName, async () => {
    const profile = await loadProfile(userName);
    profile.recent_checkins.push(checkIn);
    await saveProfile(userName, profile);
  });
}

/**
 * Append a coach note to the user's profile and save.
 */
export function recordCoachNote(userName: string, note: string): Promise<void> {
  return withLock(userName, async () => {
    const profile = await loadProfile(userName);
    if (!profile.coach_notes) profile.coach_notes = [];
    profile.coach_notes.push(`[${today()}] ${note}`);
    await saveProfile(userName, profile);
  });
}
