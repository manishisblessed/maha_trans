/**
 * Quick Twilio smoke-test.
 * Usage:  tsx scripts/test-twilio.ts <phone>
 * Example: tsx scripts/test-twilio.ts 9090702705
 *
 * Runs THREE checks:
 *  1. Validates credentials (GET /Accounts/<SID>)
 *  2. Validates Verify Service SID (GET /v2/Services/<SID>)
 *  3. Sends a live OTP via Twilio Verify to the supplied phone
 *  4. Sends a live transactional SMS via Programmable Messaging to the phone
 */
import "./_load-env";

const ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID!;
const AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN!;
const VERIFY_SID    = process.env.TWILIO_VERIFY_SERVICE_SID!;
const MESSAGING_SID = process.env.TWILIO_MESSAGING_SERVICE_SID!;

const AUTH = `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`;

function toE164(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  return phone.startsWith("+") ? phone : `+${d}`;
}

async function checkCreds() {
  console.log("\n[1/4] Checking Twilio account credentials...");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}.json`;
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  const d = await r.json() as Record<string, unknown>;
  if (r.ok) {
    console.log(`     ✅ Account OK — FriendlyName: "${d.friendly_name}", Status: ${d.status}`);
  } else {
    console.error(`     ❌ Credential check FAILED (${r.status}): ${d.message}`);
    process.exit(1);
  }
}

async function checkVerifyService() {
  console.log("\n[2/4] Validating Twilio Verify Service SID...");
  if (!VERIFY_SID) {
    console.error("     ❌ TWILIO_VERIFY_SERVICE_SID is empty — set it in .env");
    process.exit(1);
  }
  const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}`;
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  const d = await r.json() as Record<string, unknown>;
  if (r.ok) {
    console.log(`     ✅ Verify Service OK — FriendlyName: "${d.friendly_name}", SID: ${d.sid}`);
  } else {
    console.error(`     ❌ Verify Service check FAILED (${r.status}): ${d.message}`);
    process.exit(1);
  }
}

async function sendVerifyOtp(phone: string) {
  console.log(`\n[3/4] Sending OTP via Twilio Verify to ${toE164(phone)}...`);
  const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`;
  const body = new URLSearchParams({ To: toE164(phone), Channel: "sms" });
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const d = await r.json() as Record<string, unknown>;
  if (r.ok && d.status === "pending") {
    console.log(`     ✅ OTP sent! SID: ${d.sid}, Status: ${d.status}`);
    console.log(`     → Check your phone for a 6-digit OTP from Twilio`);
  } else {
    console.error(`     ❌ Verify OTP FAILED (${r.status}): ${d.message}`);
    console.error("     Raw:", JSON.stringify(d, null, 2));
  }
}

async function sendTransactionalSms(phone: string) {
  console.log(`\n[4/4] Sending transactional SMS via Programmable Messaging to ${toE164(phone)}...`);
  if (!MESSAGING_SID) {
    console.error("     ❌ TWILIO_MESSAGING_SERVICE_SID is empty — set it in .env");
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    To: toE164(phone),
    MessagingServiceSid: MESSAGING_SID,
    Body: "TRANSPE: This is a test message. Your platform messaging is working correctly! Ref: smoke-test",
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const d = await r.json() as Record<string, unknown>;
  if (r.ok || r.status === 201) {
    console.log(`     ✅ SMS sent! SID: ${d.sid}, Status: ${d.status}`);
  } else {
    console.error(`     ❌ Transactional SMS FAILED (${r.status}): ${d.message}`);
    console.error("     Raw:", JSON.stringify(d, null, 2));
  }
}

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("\n❌ Usage: tsx scripts/test-twilio.ts <phone>");
    console.error("   Example: tsx scripts/test-twilio.ts 9090702705");
    process.exit(1);
  }

  console.log("=================================================");
  console.log("  TRANSPE — Twilio Smoke Test");
  console.log("=================================================");
  console.log(`  Account SID  : ${ACCOUNT_SID}`);
  console.log(`  Verify SID   : ${VERIFY_SID || "(empty)"}`);
  console.log(`  Messaging SID: ${MESSAGING_SID || "(empty)"}`);
  console.log(`  Target Phone : ${toE164(phone)}`);
  console.log("=================================================");

  await checkCreds();
  await checkVerifyService();
  await sendVerifyOtp(phone);
  await sendTransactionalSms(phone);

  console.log("\n=================================================");
  console.log("  All checks complete.");
  console.log("=================================================\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
