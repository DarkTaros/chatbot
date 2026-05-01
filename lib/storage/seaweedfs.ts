import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

export type PublicImageUpload = {
  body: ArrayBuffer;
  contentType: string;
  filename: string;
};

export type UploadedImage = {
  url: string;
  pathname: string;
  contentType: string;
};

type SeaweedFsConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
};

let cachedClient: S3Client | undefined;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getPublicBaseUrl(value: string) {
  const url = new URL(value);
  return trimTrailingSlash(url.toString());
}

export function getSeaweedFsConfig(): SeaweedFsConfig {
  return {
    endpoint: trimTrailingSlash(getRequiredEnv("SEAWEEDFS_S3_ENDPOINT")),
    region: process.env.SEAWEEDFS_S3_REGION?.trim() || "us-east-1",
    accessKeyId: getRequiredEnv("SEAWEEDFS_S3_ACCESS_KEY"),
    secretAccessKey: getRequiredEnv("SEAWEEDFS_S3_SECRET_KEY"),
    bucket: getRequiredEnv("SEAWEEDFS_S3_BUCKET"),
    publicBaseUrl: getPublicBaseUrl(
      getRequiredEnv("SEAWEEDFS_PUBLIC_BASE_URL")
    ),
    forcePathStyle: process.env.SEAWEEDFS_S3_FORCE_PATH_STYLE !== "false",
  };
}

export function getSeaweedFsClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getSeaweedFsConfig();

  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

function sanitizeFilename(filename: string) {
  const normalized = filename.trim() || "upload";
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildObjectKey(filename: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `chat-uploads/${year}/${month}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
}

function buildPublicUrl(bucket: string, key: string, baseUrl: string) {
  return new URL(`${bucket}/${key}`, `${baseUrl}/`).toString();
}

export async function uploadPublicImage(
  input: PublicImageUpload
): Promise<UploadedImage> {
  const config = getSeaweedFsConfig();
  const key = buildObjectKey(input.filename);

  await getSeaweedFsClient().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: new Uint8Array(input.body),
      ContentType: input.contentType,
    })
  );

  return {
    url: buildPublicUrl(config.bucket, key, config.publicBaseUrl),
    pathname: key,
    contentType: input.contentType,
  };
}

export async function ensureSeaweedFsBucket() {
  const config = getSeaweedFsConfig();
  const client = getSeaweedFsClient();

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return;
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      (error.name === "NotFound" || error.$metadata.httpStatusCode === 404)
    ) {
      await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
      return;
    }

    throw error;
  }
}
