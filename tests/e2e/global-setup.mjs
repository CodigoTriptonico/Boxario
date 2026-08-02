import {
  assertLocalCredentialScript,
  requireLocalCredential,
  requireLoopbackHttpOrigin,
} from "../../scripts/lib/local-credential-guard.mjs";

export default function globalSetup() {
  assertLocalCredentialScript();
  requireLoopbackHttpOrigin("APP_BASE_URL");
  requireLoopbackHttpOrigin("NEXT_PUBLIC_SUPABASE_URL");
  requireLocalCredential("LOCAL_TEST_USER_EMAIL");
  requireLocalCredential("LOCAL_TEST_USER_PASSWORD");
}
