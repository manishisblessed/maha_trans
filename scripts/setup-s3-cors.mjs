/**
 * One-time setup: configure CORS on the S3 KYC bucket so browsers can PUT
 * liveness videos directly via presigned URLs.
 *
 * Root cause of "Upload failed — network or storage error":
 *   The S3 bucket has no CORS rules. The browser's OPTIONS preflight for the
 *   cross-origin PUT is rejected by S3, causing fetch() to throw.
 *
 * Run once (or after the bucket is recreated):
 *   node scripts/setup-s3-cors.mjs
 *
 * Credentials are read from environment variables (same as .env):
 *   AWS_REGION, S3_KYC_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Load .env manually (avoid a dotenv dependency in this standalone script)
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");

try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"#\r\n]*)"?\s*(?:#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // .env not found — rely on already-set environment variables.
}

const require = createRequire(import.meta.url);
const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } =
  require("@aws-sdk/client-s3");

// ---------------------------------------------------------------------------
// Validate config
// ---------------------------------------------------------------------------
const region = process.env.AWS_REGION || "ap-south-1";
const bucket = process.env.S3_KYC_BUCKET;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucket) {
  console.error("❌  S3_KYC_BUCKET is not set in environment / .env");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build allowed origins (app URL + common local dev ports)
// ---------------------------------------------------------------------------
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://transpe.net").replace(/\/$/, "");

const allowedOrigins = [
  appUrl,
  "http://localhost:3000",
  "http://localhost:3001",
];

// ---------------------------------------------------------------------------
// CORS rules
// ---------------------------------------------------------------------------
const corsConfig = {
  CORSRules: [
    {
      ID: "transpe-liveness-video-upload",
      /** Content-Type is the only header the browser sends on the presigned PUT. */
      AllowedHeaders: ["content-type", "x-amz-*"],
      AllowedMethods: ["PUT"],
      AllowedOrigins: allowedOrigins,
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

// ---------------------------------------------------------------------------
// Apply + verify
// ---------------------------------------------------------------------------
const client = new S3Client({
  region,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  // Allow the SDK to follow region redirects (PermanentRedirect) automatically
  // when the bucket's actual region differs from what's in .env.
  followRegionRedirects: true,
  ...(accessKeyId && secretAccessKey
    ? { credentials: { accessKeyId, secretAccessKey } }
    : {}),
});

console.log(`\n📦  Bucket  : ${bucket}`);
console.log(`🌏  Region  : ${region}`);
console.log(`🔗  Origins : ${allowedOrigins.join(", ")}\n`);

try {
  await client.send(
    new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: corsConfig }),
  );
  console.log("✅  PutBucketCors succeeded.");

  // Read back to confirm
  const { CORSRules } = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("\nActive CORS rules on bucket:");
  console.log(JSON.stringify(CORSRules, null, 2));
  console.log(
    "\n🎉  Done. Browser can now PUT liveness videos directly to S3.\n" +
    "    The server-side proxy fallback in LivenessVideoCapture.tsx remains\n" +
    "    as a safety net for users behind strict corporate firewalls.\n",
  );
} catch (err) {
  console.error("\n❌  Failed to set CORS:", err.message ?? err);
  console.error(
    "\nCommon causes:\n" +
    "  • Missing s3:PutBucketCors permission on the IAM user/role\n" +
    "  • Bucket does not exist or the name is wrong\n" +
    "  • Wrong AWS region\n",
  );
  process.exit(1);
}
