function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shared wrapper for transactional emails. Inline styles only, no external
 * stylesheet or CSS variables — most email clients strip or ignore both.
 */
function emailShell({
  accentColor,
  headerLabel,
  bodyHtml,
}: {
  accentColor: string;
  headerLabel: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
            <tr>
              <td style="background-color:${accentColor};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:600;">${headerLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(accentColor: string, url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:${accentColor};">
                      <a
                        href="${url}"
                        style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;"
                        >${label}</a
                      >
                    </td>
                  </tr>
                </table>`;
}

export function inviteEmailHtml({
  orgName,
  accentColor,
  inviterName,
  roleName,
  inviteUrl,
}: {
  orgName: string;
  accentColor: string;
  inviterName: string;
  roleName: string;
  inviteUrl: string;
}): string {
  const org = escapeHtml(orgName);
  const inviter = escapeHtml(inviterName);
  const role = escapeHtml(roleName);

  return emailShell({
    accentColor,
    headerLabel: org,
    bodyHtml: `
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#18181b;">
                  <strong>${inviter}</strong> invited you to join <strong>${org}</strong> on Formation as
                  <strong>${role}</strong>.
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#52525b;">
                  Formation is where the team tracks rosters, schedules, and availability. Click below to accept and
                  set up your account.
                </p>
                ${ctaButton(accentColor, inviteUrl, "Accept invite")}
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                  Or paste this link into your browser:<br />
                  <a href="${inviteUrl}" style="color:#71717a;word-break:break-all;">${inviteUrl}</a>
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                  This invite expires in 7 days. If you weren't expecting this, you can ignore this email.
                </p>`,
  });
}

const FORMATION_ACCENT = "#6366f1";

export function verifyEmailHtml({ name, verifyUrl }: { name: string; verifyUrl: string }): string {
  const safeName = escapeHtml(name);

  return emailShell({
    accentColor: FORMATION_ACCENT,
    headerLabel: "Formation",
    bodyHtml: `
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#18181b;">
                  Hi ${safeName}, confirm this is your email address to finish setting up your Formation account.
                </p>
                ${ctaButton(FORMATION_ACCENT, verifyUrl, "Verify email")}
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                  Or paste this link into your browser:<br />
                  <a href="${verifyUrl}" style="color:#71717a;word-break:break-all;">${verifyUrl}</a>
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                  This link expires in 24 hours. If you didn't create a Formation account, you can ignore this email.
                </p>`,
  });
}
