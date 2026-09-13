// One-off script: enables Anonymous + Google sign-in and authorizes the
// Vercel deployment domain for project atlas-rishinair, via the Identity
// Toolkit Admin API (same auth the firebase CLI uses).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PROJECT_ID = "atlas-rishinair";
const PROJECT_NUMBER = "45683886627";
const EXTRA_DOMAINS = ["atlas-rishinair-codes-projects.vercel.app"];
const BASE_DOMAINS = [
  "localhost",
  "atlas-rishinair.firebaseapp.com",
  "atlas-rishinair.web.app",
];

function readRefreshToken() {
  const cfgPath = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
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
  return (await res.json()).access_token;
}

async function main() {
  const accessToken = await getAccessToken(readRefreshToken());
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // 0. Make sure the Identity Toolkit API is enabled for the project.
  const enableRes = await fetch(
    `https://serviceusage.googleapis.com/v1/projects/${PROJECT_NUMBER}/services/identitytoolkit.googleapis.com:enable`,
    { method: "POST", headers: authHeaders },
  );
  if (!enableRes.ok && enableRes.status !== 409) {
    console.error(`Enable API warning: ${enableRes.status} ${await enableRes.text()}`);
  } else {
    console.log("✅ Identity Toolkit API enabled");
  }

  const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}`;

  // 1. Create the Identity Platform config (idempotent: 409 = exists).
  const createRes = await fetch(base + "/config", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      signIn: {
        anonymous: { enabled: true },
      },
      authorizedDomains: [...BASE_DOMAINS, ...EXTRA_DOMAINS],
    }),
  });
  if (createRes.ok) {
    console.log("✅ Auth config created");
  } else if (createRes.status === 409 || createRes.status === 400) {
    console.log("ℹ️  Auth config already exists — will patch instead");
  } else {
    console.error(`❌ POST config failed: ${createRes.status}`);
    console.error(await createRes.text());
    process.exitCode = 1;
  }
  const patchRes = await fetch(base + "/config?updateMask=signIn,authorizedDomains", {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      signIn: {
        anonymous: { enabled: true },
      },
      authorizedDomains: [...BASE_DOMAINS, ...EXTRA_DOMAINS],
    }),
  });

  if (patchRes.ok) {
    const json = await patchRes.json();
    console.log("✅ Anonymous sign-in enabled:", json.signIn?.anonymous?.enabled === true);
    console.log("✅ Authorized domains:", json.authorizedDomains?.join(", "));
  } else {
    console.error(`❌ PATCH config failed: ${patchRes.status}`);
    console.error(await patchRes.text());
    process.exitCode = 1;
  }

  // 2. Enable Google as a default supported IdP.
  const googleRes = await fetch(
    base + "/defaultSupportedIdpConfigs/google.com?updateMask=enabled",
    {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ enabled: true }),
    },
  );

  if (googleRes.ok) {
    const json = await googleRes.json();
    console.log("✅ Google sign-in enabled:", json.enabled === true);
  } else {
    console.error(`❌ Google IdP PATCH failed: ${googleRes.status}`);
    console.error(await googleRes.text());
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
