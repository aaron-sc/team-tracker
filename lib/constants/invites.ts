/** How many people one user may invite directly (bypassing the AccessRequest admin-review gate)
 *  to sign up and create their own new org — see the UserInvite model's doc comment in
 *  prisma/schema.prisma. Counts every invite ever created, so revoking/expiring one doesn't free
 *  up a new slot. A plain constant, not exported from lib/actions/auth.ts, since a "use server"
 *  file may only export async functions. */
export const MAX_USER_INVITES = 3;
