import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getPrivateKey, getPublicKey, getKeyId } from "@/lib/oauth/keys";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/oauth/constants";

export type IdentityClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

/** Signs the OIDC id_token returned from /oauth/token — the thing a client actually trusts to say
 *  who the user is. `nonce` is only present for a genuine OIDC (not plain OAuth) request; per spec
 *  it must be echoed back exactly as the client sent it at /oauth/authorize. */
export async function signIdToken(params: {
  issuer: string;
  audience: string;
  claims: IdentityClaims;
  nonce?: string | null;
}): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({
    email: params.claims.email,
    email_verified: params.claims.emailVerified,
    name: params.claims.name,
    picture: params.claims.picture ?? undefined,
    ...(params.nonce ? { nonce: params.nonce } : {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: getKeyId() })
    .setSubject(params.claims.sub)
    .setIssuer(params.issuer)
    .setAudience(params.audience)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key);
}

/** The bearer token a client presents to /oauth/userinfo. Deliberately minimal — just enough to
 *  identify who it's for, since the actual profile fields are re-fetched fresh from the DB at
 *  userinfo time rather than baked into this token. */
export async function signAccessToken(params: { issuer: string; audience: string; sub: string; scope: string }): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({ scope: params.scope })
    .setProtectedHeader({ alg: "RS256", kid: getKeyId() })
    .setSubject(params.sub)
    .setIssuer(params.issuer)
    .setAudience(params.audience)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyAccessToken(token: string, issuer: string): Promise<{ sub: string; scope: string }> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, { issuer, algorithms: ["RS256"] });
  if (typeof payload.sub !== "string") throw new Error("Access token missing subject.");
  return { sub: payload.sub, scope: typeof payload.scope === "string" ? payload.scope : "" };
}
