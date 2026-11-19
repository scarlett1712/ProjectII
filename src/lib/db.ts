import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg(url);
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Automatically start background reminder daemon when running in standard Node.js process (non-serverless)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
if (typeof window === "undefined" && !isServerless) {
  const globalForWorker = globalThis as unknown as {
    backgroundWorkerStarted?: boolean;
  };
  if (!globalForWorker.backgroundWorkerStarted) {
    globalForWorker.backgroundWorkerStarted = true;
    import("./backgroundWorker")
      .then(({ startBackgroundWorker }) => {
        startBackgroundWorker();
      })
      .catch((err) => {
        console.error("Failed to start background worker:", err);
      });
  }
}
