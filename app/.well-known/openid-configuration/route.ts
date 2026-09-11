import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils/base-url";
import { SUPPORTED_SCOPES } from "@/lib/oauth/constants";

/**
 * OIDC discovery document — lets a client (the hub, Vault) configure its Auth.js OIDC provider
 * with just Formation's base URL and have every other endpoint below auto-discovered.
 */
export async function GET() {
  const issuer = await getBaseUrl();
  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    jwks_uri: `${issuer}/oauth/jwks`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: [...SUPPORTED_SCOPES],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code"],
  });
}
