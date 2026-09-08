import type { NextRequest } from "next/server";
import { approveAccessRequest, denyAccessRequest, verifyDecisionSig } from "@/lib/access-requests/service";
import { getBaseUrl } from "@/lib/utils/base-url";

/**
 * Signed one-click approve/deny link, the fallback for when the Discord bot's buttons aren't
 * available (bot not configured, or the review message is too old to edit). Public by design —
 * the HMAC signature in `sig` (see signDecision, keyed on AUTH_SECRET) is what authorizes it,
 * not a Formation session. Whitelisted in lib/auth/auth.config.ts.
 */
function resultPage(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
      `<body style="font-family:system-ui,-apple-system,sans-serif;background:#f4f4f5;margin:0">` +
      `<div style="max-width:32rem;margin:14vh auto;padding:2rem;background:#fff;border-radius:12px;text-align:center">` +
      `<h1 style="font-size:1.2rem;margin:0 0 .75rem">${title}</h1>` +
      `<p style="color:#52525b;line-height:1.5;margin:0;word-break:break-word">${body}</p></div></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const action = searchParams.get("action") ?? "";
  const sig = searchParams.get("sig") ?? "";

  if (!verifyDecisionSig(token, action, sig)) {
    return resultPage("Invalid link", "This approval link is malformed, expired, or has been tampered with.");
  }

  const baseUrl = await getBaseUrl();

  if (action === "approve") {
    const result = await approveAccessRequest(token, "link", baseUrl);
    if (!result.ok) return resultPage("Couldn't approve", result.error);
    return resultPage(
      result.alreadyDecided ? "Already approved" : "Approved",
      `${result.email} can create their organization. A single-use signup link ${
        result.alreadyDecided ? "was already" : "has been"
      } emailed to them.<br><br><code style="font-size:.8rem">${result.signupUrl}</code>`,
    );
  }

  const result = await denyAccessRequest(token, "link");
  if (!result.ok) return resultPage("Couldn't deny", result.error);
  return resultPage(
    result.alreadyDecided ? "Already denied" : "Denied",
    `${result.email} will not get access.`,
  );
}
