import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
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

type RustFsConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
  publicReadPolicyEnabled: boolean;
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

function isEnvDisabled(name: string) {
  return process.env[name]?.trim().toLowerCase() === "false";
}

function buildPublicReadPolicy(bucket: string) {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

export function getRustFsConfig(): RustFsConfig {
  return {
    endpoint: trimTrailingSlash(getRequiredEnv("RUSTFS_S3_ENDPOINT")),
    region: process.env.RUSTFS_S3_REGION?.trim() || "us-east-1",
    accessKeyId: getRequiredEnv("RUSTFS_S3_ACCESS_KEY"),
    secretAccessKey: getRequiredEnv("RUSTFS_S3_SECRET_KEY"),
    bucket: getRequiredEnv("RUSTFS_S3_BUCKET"),
    publicBaseUrl: getPublicBaseUrl(getRequiredEnv("RUSTFS_PUBLIC_BASE_URL")),
    forcePathStyle: !isEnvDisabled("RUSTFS_S3_FORCE_PATH_STYLE"),
    publicReadPolicyEnabled: !isEnvDisabled("RUSTFS_S3_PUBLIC_READ_POLICY"),
  };
}

export function getRustFsClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getRustFsConfig();

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
  const config = getRustFsConfig();
  const key = buildObjectKey(input.filename);

  await getRustFsClient().send(
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

export async function ensureRustFsBucket() {
  const config = getRustFsConfig();
  const client = getRustFsClient();

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      (error.name === "NotFound" || error.$metadata.httpStatusCode === 404)
    ) {
      await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
    } else {
      throw error;
    }
  }

  if (!config.publicReadPolicyEnabled) {
    return;
  }

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: config.bucket,
      Policy: buildPublicReadPolicy(config.bucket),
    })
  );
}
