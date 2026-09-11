import { NextResponse } from "next/server";
import { exportJWK } from "jose";
import { getPublicKey, getKeyId } from "@/lib/oauth/keys";

/**
 * The public half of the RSA keypair id_tokens/access_tokens are signed with, published so
 * clients (the hub, Vault) can verify a token without ever holding a shared secret. Standard OIDC
 * discovery convention — Auth.js's generic OIDC provider fetches this automatically via the
 * `jwks_uri` in /.well-known/openid-configuration.
 */
export async function GET() {
  const publicKey = await getPublicKey();
  const jwk = await exportJWK(publicKey);
  return NextResponse.json(
    { keys: [{ ...jwk, kid: getKeyId(), use: "sig", alg: "RS256" }] },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
