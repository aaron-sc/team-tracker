import "server-only";
import crypto from "node:crypto";
import { importPKCS8, importSPKI, type CryptoKey } from "jose";

/**
 * The RSA keypair Formation signs id_tokens/access_tokens with, as an OIDC provider (see
 * lib/oauth/tokens.ts). Held only here — clients (the hub, Vault) never see the private key; they
 * fetch the public half from /oauth/jwks and verify against that instead. Generate a pair once
 * with:
 *   node -e "const{privateKey,publicKey}=require('crypto').generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});console.log('OIDC_PRIVATE_KEY='+Buffer.from(privateKey).toString('base64url'));console.log('OIDC_PUBLIC_KEY='+Buffer.from(publicKey).toString('base64url'))"
 * and put both lines in .env — base64url-encoded so a multi-line PEM survives as one env var.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set — generate an RSA keypair (see lib/oauth/keys.ts) and add it to .env before using any /oauth/* route.`,
    );
  }
  return value;
}

function decodePem(base64url: string): string {
  return Buffer.from(base64url, "base64url").toString("utf8");
}

// A short, stable identifier for the current key, published in the JWKS response and stamped into
// every token's header — lets a future key rotation add a second JWKS entry without clients ever
// needing to guess which key signed a given token.
export function getKeyId(): string {
  return crypto.createHash("sha256").update(requireEnv("OIDC_PUBLIC_KEY")).digest("hex").slice(0, 16);
}

let cachedPrivateKey: Promise<CryptoKey> | null = null;
let cachedPublicKey: Promise<CryptoKey> | null = null;

export function getPrivateKey(): Promise<CryptoKey> {
  if (!cachedPrivateKey) {
    cachedPrivateKey = importPKCS8(decodePem(requireEnv("OIDC_PRIVATE_KEY")), "RS256");
  }
  return cachedPrivateKey;
}

export function getPublicKey(): Promise<CryptoKey> {
  if (!cachedPublicKey) {
    cachedPublicKey = importSPKI(decodePem(requireEnv("OIDC_PUBLIC_KEY")), "RS256");
  }
  return cachedPublicKey;
}
