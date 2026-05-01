import { config } from "dotenv";
import { ensureRustFsBucket, getRustFsConfig } from "../lib/storage/rustfs";

config({
  path: ".env.local",
});

function isRetryableRustFsError(error: unknown) {
  const candidates = [
    error,
    error instanceof Error ? error.cause : undefined,
  ].filter(Boolean) as Array<
    Partial<Error> & {
      code?: string;
      name?: string;
      $metadata?: { httpStatusCode?: number };
    }
  >;

  return candidates.some(
    (candidate) =>
      candidate.code === "ECONNRESET" ||
      candidate.code === "ECONNREFUSED" ||
      candidate.code === "ENOTFOUND" ||
      candidate.code === "EHOSTUNREACH" ||
      candidate.name === "TimeoutError" ||
      candidate.$metadata?.httpStatusCode === 503
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const rustFsConfig = getRustFsConfig();

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await ensureRustFsBucket();
      console.log(`RustFS bucket ready: ${rustFsConfig.bucket}`);

      if (rustFsConfig.publicReadPolicyEnabled) {
        console.log("RustFS public read bucket policy applied");
      }

      return;
    } catch (error) {
      if (!isRetryableRustFsError(error) || attempt === 10) {
        throw error;
      }

      console.warn(
        `RustFS is not ready yet (attempt ${attempt}/10). Retrying in 2s...`
      );
      await wait(2000);
    }
  }
}

main().catch((error) => {
  console.error("Failed to initialize RustFS bucket");
  console.error(error);
  process.exit(1);
});
