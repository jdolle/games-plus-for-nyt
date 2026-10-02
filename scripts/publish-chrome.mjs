// Uploads a packaged build to the Chrome Web Store and submits it for review, through the Chrome Web
// Store API (v2) as a Google Cloud service account. Node built-ins only. Run by
// .github/workflows/release.yml; the one-time setup (first manual publish, service account, secret and
// variables) is in docs/RELEASING.md.
//
//   node scripts/publish-chrome.mjs <zip>                 upload the zip and submit it for review
//   node scripts/publish-chrome.mjs <zip> --no-publish    upload only (a draft, submitted from the dashboard)
//   node scripts/publish-chrome.mjs --status              print the item's published and submitted state
//
// Environment:
//   CWS_SERVICE_ACCOUNT_KEY   the service account's JSON key (the whole file); the account must be added
//                             to the publisher in the Developer Dashboard under Account
//   CWS_PUBLISHER_ID          Developer Dashboard → Publisher → Settings
//   CWS_EXTENSION_ID          the item's id (the 32-letter id in its store URL)
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const API = "https://chromewebstore.googleapis.com";
const SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const UPLOAD_TIMEOUT_MS = 2 * 60_000;
const POLL_MS = 5_000;

const args = process.argv.slice(2);
const statusOnly = args.includes("--status");
const submit = !args.includes("--no-publish");
const zipPath = args.find((a) => !a.startsWith("--"));
if (!statusOnly && !zipPath) fail("usage: node scripts/publish-chrome.mjs <zip> [--no-publish] | --status");

const env = (name) => process.env[name]?.trim() || fail(`${name} is not set`);
const item = `publishers/${env("CWS_PUBLISHER_ID")}/items/${env("CWS_EXTENSION_ID")}`;
const key = parseKey(env("CWS_SERVICE_ACCOUNT_KEY"));
let token = "";

try {
  token = await accessToken(key);
  if (statusOnly) {
    printStatus(await api("GET", `${API}/v2/${item}:fetchStatus`));
  } else {
    const version = await upload(zipPath);
    if (!submit) {
      console.log(`[nyte] uploaded ${version} as a draft; submit it from the Developer Dashboard`);
    } else {
      const state = await publish();
      console.log(`[nyte] uploaded ${version} and submitted it for review (${state})`);
    }
  }
} catch (err) {
  fail(`request failed: ${err.message}`);
}

function fail(message, detail) {
  console.error(`[nyte] ${message}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

function parseKey(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    fail("CWS_SERVICE_ACCOUNT_KEY is not valid JSON (paste the whole key file)");
  }
  for (const field of ["client_email", "private_key"]) {
    if (typeof json[field] !== "string" || !json[field]) fail(`CWS_SERVICE_ACCOUNT_KEY has no "${field}"; it must be a service account key`);
  }
  return { email: json.client_email, privateKey: json.private_key, tokenUri: json.token_uri || "https://oauth2.googleapis.com/token" };
}

// Self-signed JWT exchanged for an access token (needs nothing beyond the key: no IAM roles).
async function accessToken({ email, privateKey, tokenUri }) {
  const b64url = (data) => Buffer.from(data).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
  let signature;
  try {
    signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey, "base64url");
  } catch (err) {
    fail(`cannot sign with the service account's private key: ${err.message}`);
  }
  const res = await fetch(tokenUri, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    fail(`token request for ${email} failed (HTTP ${res.status}): ${body.error_description ?? body.error ?? "no access token in the response"}`);
  }
  return body.access_token;
}

// One call to the store API; a non-2xx response ends the run with Google's error message and details.
async function api(method, url, { body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers["Content-Type"] = contentType;
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const error = json.error ?? {};
    const status = error.status ? ` ${error.status}` : "";
    fail(`${method} ${url.slice(API.length)} failed (HTTP ${res.status}${status}): ${error.message ?? "unexpected response"}`, error.details ?? (error.message ? undefined : json));
  }
  return json;
}

async function upload(path) {
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch (err) {
    fail(`cannot read ${path}: ${err.message}`);
  }
  console.log(`[nyte] uploading ${path} (${Math.round(bytes.length / 1024)} KB) to ${item}`);
  let result = await api("POST", `${API}/upload/v2/${item}:upload`, { body: bytes, contentType: "application/zip" });
  let state = result.uploadState;
  const deadline = Date.now() + UPLOAD_TIMEOUT_MS;
  while (state === "IN_PROGRESS" || state === "UPLOAD_IN_PROGRESS") {
    if (Date.now() > deadline) fail(`upload still processing after ${UPLOAD_TIMEOUT_MS / 1000} s; check the Developer Dashboard`, result);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    result = await api("GET", `${API}/v2/${item}:fetchStatus`);
    state = result.lastAsyncUploadState;
    console.log(`[nyte] upload state: ${state}`);
  }
  if (state !== "SUCCEEDED" && state !== "SUCCESS") fail(`upload failed (uploadState ${state ?? "missing"})`, result);
  const version = result.crxVersion ?? result.submittedItemRevisionStatus?.distributionChannels?.[0]?.crxVersion;
  return version ? `version ${version}` : "the package";
}

async function publish() {
  const result = await api("POST", `${API}/v2/${item}:publish`, { body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }), contentType: "application/json" });
  if (result.warningInfo) console.warn("[nyte] warnings from the store:", JSON.stringify(result.warningInfo, null, 2));
  if (result.state === "REJECTED" || result.state === "CANCELLED") fail(`submission ended in state ${result.state}`, result);
  return result.state ?? "state not reported";
}

function printStatus(status) {
  const revision = (label, rev) => {
    if (!rev) return `${label}: none`;
    const versions = (rev.distributionChannels ?? [])
      .map((c) => `${c.crxVersion ?? "?"}${c.deployPercentage != null && c.deployPercentage !== 100 ? ` (${c.deployPercentage}%)` : ""}`)
      .join(", ");
    return `${label}: ${rev.state ?? "?"}${versions ? ` - ${versions}` : ""}`;
  };
  console.log(`[nyte] ${item}`);
  console.log(`[nyte] ${revision("published", status.publishedItemRevisionStatus)}`);
  console.log(`[nyte] ${revision("submitted", status.submittedItemRevisionStatus)}`);
  console.log(`[nyte] last upload: ${status.lastAsyncUploadState ?? "n/a"}${status.takenDown ? "; TAKEN DOWN" : ""}${status.warned ? "; warned" : ""}`);
}
