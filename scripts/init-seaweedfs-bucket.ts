import {
  ensureSeaweedFsBucket,
  getSeaweedFsConfig,
} from "../lib/storage/seaweedfs";

async function main() {
  const config = getSeaweedFsConfig();
  await ensureSeaweedFsBucket();
  console.log(`SeaweedFS bucket ready: ${config.bucket}`);
}

main().catch((error) => {
  console.error("Failed to initialize SeaweedFS bucket");
  console.error(error);
  process.exit(1);
});
