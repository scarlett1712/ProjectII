import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../application/notificationUseCases", () => ({ runReminderCron: vi.fn() }));

import { isAuthorizedCron } from "./reminderCronController";

describe("isAuthorizedCron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer wrong", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });

  it("fails closed in production when CRON_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthorizedCron(null, undefined)).toBe(false);
  });

  it("allows calls without a secret during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isAuthorizedCron(null, undefined)).toBe(true);
  });
});
