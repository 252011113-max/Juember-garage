const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type AttemptWindow = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptWindow>();

function getKeys(email: string, address: string): string[] {
  return address === "unknown"
    ? [`email:${email}`]
    : [`email:${email}`, `address:${address}`];
}

function pruneExpired(now: number): void {
  for (const [key, window] of attempts) {
    if (window.resetAt <= now) {
      attempts.delete(key);
    }
  }
}

export function isLoginRateLimited(
  email: string,
  address: string,
  now = Date.now(),
): boolean {
  pruneExpired(now);
  return getKeys(email, address).some((key) => {
    const window = attempts.get(key);
    return window !== undefined && window.count >= MAX_ATTEMPTS;
  });
}

export function recordFailedLogin(
  email: string,
  address: string,
  now = Date.now(),
): void {
  pruneExpired(now);

  for (const key of getKeys(email, address)) {
    const current = attempts.get(key);
    attempts.set(key, {
      count: current ? current.count + 1 : 1,
      resetAt: current?.resetAt ?? now + WINDOW_MS,
    });
  }
}

export function clearLoginAttempts(email: string, address: string): void {
  for (const key of getKeys(email, address)) {
    attempts.delete(key);
  }
}
