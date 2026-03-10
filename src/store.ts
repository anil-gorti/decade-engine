import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { UserProfile, ActionRecord, CheckIn } from "./types.js";
import { TEST_USERS } from "./test-user.js";
import { today } from "./util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function userPath(userName: string): string {
  return path.join(DATA_DIR, `${userName}.json`);
}

/**
 * Load a user profile from disk.
 * If no file exists yet, seed it from the test-user defaults.
 */
export function loadProfile(userName: string): UserProfile {
  ensureDataDir();
  const filePath = userPath(userName);

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as UserProfile;
  }

  // Seed from test data
  const seed = TEST_USERS[userName as keyof typeof TEST_USERS];
  if (!seed) throw new Error(`Unknown user: ${userName}`);

  saveProfile(userName, seed);
  return structuredClone(seed);
}

/**
 * Save a user profile to disk.
 * Uses atomic write (write to tmp, then rename) to prevent corruption.
 */
export function saveProfile(userName: string, profile: UserProfile): void {
  ensureDataDir();
  const target = userPath(userName);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(profile, null, 2));
  fs.renameSync(tmp, target);
}

/**
 * List all known user names — merges test defaults with any on-disk profiles.
 */
export function listUsers(): string[] {
  ensureDataDir();
  const onDisk = fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));

  const testKeys = Object.keys(TEST_USERS);
  const merged = new Set([...testKeys, ...onDisk]);
  return [...merged];
}

/**
 * Check if the user already has an action recorded for today.
 */
export function hasActionToday(userName: string): boolean {
  try {
    const profile = loadProfile(userName);
    return profile.action_history.some((a) => a.date === today());
  } catch {
    return false;
  }
}

// Simple per-user lock to prevent concurrent load→mutate→save races
const locks = new Map<string, Promise<void>>();

function withLock<T>(userName: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = locks.get(userName) ?? Promise.resolve();
  const next = prev.then(fn, fn); // run fn after previous lock releases
  locks.set(userName, next.then(() => { }, () => { })); // swallow so chain continues
  return next;
}

/**
 * Append an action to the user's history and save.
 */
export function recordAction(userName: string, action: ActionRecord): Promise<void> {
  return withLock(userName, () => {
    const profile = loadProfile(userName);
    profile.action_history.push(action);
    saveProfile(userName, profile);
  });
}

/**
 * Append a check-in to the user's recent check-ins and save.
 */
export function recordCheckIn(userName: string, checkIn: CheckIn): Promise<void> {
  return withLock(userName, () => {
    const profile = loadProfile(userName);
    profile.recent_checkins.push(checkIn);
    saveProfile(userName, profile);
  });
}

/**
 * Append a coach note to the user's profile and save.
 */
export function recordCoachNote(userName: string, note: string): Promise<void> {
  return withLock(userName, () => {
    const profile = loadProfile(userName);
    if (!profile.coach_notes) profile.coach_notes = [];
    profile.coach_notes.push(`[${today()}] ${note}`);
    saveProfile(userName, profile);
  });
}
