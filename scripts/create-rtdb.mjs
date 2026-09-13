// One-off script: provisions the default Realtime Database instance for
// project atlas-rishinair using the Firebase Management REST API, because
// firebase-tools requires an interactive prompt for first-instance creation.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PROJECT_ID = "atlas-rishinair";
const REGION = "us-central1";
const INSTANCE = "atlas-rishinair-default";

function readRefreshToken() {
  const cfgPath = path.join(
    os.homedir(),
    ".config/configstore/firebase-tools.json",
  );
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const token = cfg?.tokens?.refresh_token;
  if (!token) throw new Error("No Firebase CLI refresh token found — run `firebase login` first.");
  return token;
}

async function getAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

async function main() {
  const refreshToken = readRefreshToken();
  const accessToken = await getAccessToken(refreshToken);

  const url =
    `https://firebasedatabase.googleapis.com/v1beta/projects/${PROJECT_ID}/` +
    `locations/${REGION}/instances`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "DEFAULT_DATABASE", state: "ACTIVE" }),
  });

  if (res.ok) {
    const json = await res.json();
    console.log("✅ Database created:");
    console.log(JSON.stringify(json, null, 2));
  } else if (res.status === 409) {
    console.log("ℹ️  Database already exists — nothing to do.");
  } else {
    console.error(`❌ Failed: ${res.status}`);
    console.error(await res.text());
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
