import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { ROLE_PRESETS } from "../lib/permissions";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysFromNow = (n: number) => new Date(now + n * DAY);
const daysAgo = (n: number) => new Date(now - n * DAY);

async function reset() {
  await prisma.prospectStatusHistory.deleteMany();
  await prisma.recruitmentProspect.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.sessionAttendance.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.match.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.opponent.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.team.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Resetting database…");
  await reset();

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("Creating organization…");
  const apiKey = `fmtn_${crypto.randomBytes(24).toString("base64url")}`;
  const org = await prisma.organization.create({
    data: { name: "Nova Esports", slug: "nova-esports", timezone: "America/Chicago", apiKey },
  });

  console.log("Creating roles…");
  const roles: Record<string, string> = {};
  for (const [roleName, preset] of Object.entries(ROLE_PRESETS)) {
    const role = await prisma.role.create({
      data: {
        orgId: org.id,
        name: roleName,
        description: preset.description,
        color: preset.color,
        isSystem: true,
        permissions: { create: preset.permissions.map((permission) => ({ permission })) },
      },
    });
    roles[roleName] = role.id;
  }

  console.log("Creating teams…");
  const valorant = await prisma.team.create({
    data: { orgId: org.id, name: "Nova Valorant", game: "Valorant", slug: "nova-valorant" },
  });
  const rocketLeague = await prisma.team.create({
    data: { orgId: org.id, name: "Nova Rocket League", game: "Rocket League", slug: "nova-rocket-league" },
  });

  console.log("Creating users & memberships…");
  type Seeded = { membershipId: string; userId: string; name: string };

  async function createUser(name: string, email: string, roleId: string): Promise<Seeded> {
    const user = await prisma.user.create({ data: { name, email, passwordHash, emailVerifiedAt: new Date() } });
    const membership = await prisma.membership.create({ data: { userId: user.id, orgId: org.id, roleId } });
    return { membershipId: membership.id, userId: user.id, name };
  }

  const owner = await createUser("Aaron Santa Cruz", "aaron.santacruz03@gmail.com", roles.Owner);
  const manager = await createUser("Riley Chen", "riley.manager@example.com", roles.Manager);
  const coachV = await createUser("Marcus Webb", "marcus.coach@example.com", roles.Coach);
  const coachRL = await createUser("Priya Anand", "priya.coach@example.com", roles.Coach);
  const captainV = await createUser("Jordan Lee", "jordan.captain@example.com", roles.Captain);
  const captainRL = await createUser("Sam Torres", "sam.captain@example.com", roles.Captain);
  const analyst = await createUser("Devon Park", "devon.analyst@example.com", roles.Analyst);

  const playersV = await Promise.all([
    createUser("Ava Nguyen", "ava.player@example.com", roles.Player),
    createUser("Noah Kim", "noah.player@example.com", roles.Player),
    createUser("Liam Osei", "liam.player@example.com", roles.Player),
  ]);
  const playersRL = await Promise.all([
    createUser("Maya Patel", "maya.player@example.com", roles.Player),
    createUser("Ethan Ross", "ethan.player@example.com", roles.Player),
  ]);
  // Flex player on both rosters, to show the shared pool mechanic.
  const flexPlayer = await createUser("Casey Morgan", "casey.flex@example.com", roles.Player);

  console.log("Building team rosters…");
  const ignFor = (name: string, tag: string) => `${name.split(" ")[0]}${tag}`;

  const valorantPositions = ["Duelist", "Controller", "Initiator", "Sentinel", "Flex"];
  const valorantRoster = [captainV, ...playersV, flexPlayer];
  for (const [i, member] of valorantRoster.entries()) {
    await prisma.teamMembership.create({
      data: {
        membershipId: member.membershipId,
        teamId: valorant.id,
        position: valorantPositions[i % valorantPositions.length],
        inGameName: ignFor(member.name, "#NA1"),
        jerseyNumber: String(i + 1),
        isStarter: i < 5,
      },
    });
  }
  const rlPositions = ["Striker", "Midfield", "Goalkeeper"];
  const rlRoster = [captainRL, ...playersRL, flexPlayer];
  for (const [i, member] of rlRoster.entries()) {
    await prisma.teamMembership.create({
      data: {
        membershipId: member.membershipId,
        teamId: rocketLeague.id,
        position: rlPositions[i % rlPositions.length],
        inGameName: ignFor(member.name, "_RL"),
        jerseyNumber: String(i + 1),
        isStarter: i < 3,
      },
    });
  }
  console.log("Creating venues…");
  // collegeArena is intentionally unused beyond seeding the venue directory —
  // it represents a venue we know about but haven't booked a match/practice at yet.
  const [, orgFacility, lanCenter] = await Promise.all([
    prisma.venue.create({
      data: {
        orgId: org.id,
        name: "Midwest State Esports Arena",
        addressLine1: "1200 University Ave",
        city: "Chicago",
        state: "IL",
        postalCode: "60607",
        country: "USA",
        capacity: 250,
        contactName: "Esports Ops Office",
        contactEmail: "esports@midweststate.example.edu",
        timezone: "America/Chicago",
      },
    }),
    prisma.venue.create({
      data: {
        orgId: org.id,
        name: "Nova Practice Facility",
        addressLine1: "88 League Way, Suite 4",
        city: "Chicago",
        state: "IL",
        postalCode: "60614",
        country: "USA",
        capacity: 20,
        contactName: "Front Desk",
        contactPhone: "312-555-0134",
        timezone: "America/Chicago",
      },
    }),
    prisma.venue.create({
      data: {
        orgId: org.id,
        name: "Riverside LAN Center",
        addressLine1: "45 Riverside Blvd",
        city: "Milwaukee",
        state: "WI",
        postalCode: "53202",
        country: "USA",
        capacity: 400,
        contactName: "Event Booking",
        contactEmail: "events@riversidelan.example.com",
        contactPhone: "414-555-0199",
        timezone: "America/Chicago",
      },
    }),
  ]);

  console.log("Creating opponents…");
  const opponentNames = ["Steel City Syndicate", "Frostbyte Gaming", "Rogue Wolves", "Apex Legionnaires", "Iron Horizon"];
  const opponents = await Promise.all(
    opponentNames.map((name) => prisma.opponent.create({ data: { orgId: org.id, name } })),
  );

  console.log("Scheduling matches…");
  await prisma.match.create({
    data: {
      teamId: valorant.id,
      opponentId: opponents[0].id,
      scheduledAt: daysAgo(10),
      timezone: org.timezone,
      format: "BO3",
      locationType: "ONLINE",
      isStreamed: true,
      streamPlatform: "Twitch",
      streamUrl: "https://twitch.tv/novaesports",
      casterName: "CasterKid",
      status: "COMPLETED",
      resultStatus: "WIN",
      scoreFor: 2,
      scoreAgainst: 1,
      notes: "Close series, won map 3 on a clutch retake.",
      createdById: coachV.membershipId,
    },
  });
  await prisma.match.create({
    data: {
      teamId: valorant.id,
      opponentId: opponents[1].id,
      scheduledAt: daysAgo(3),
      timezone: org.timezone,
      format: "BO1",
      locationType: "ONLINE",
      isStreamed: false,
      status: "COMPLETED",
      resultStatus: "LOSS",
      scoreFor: 10,
      scoreAgainst: 13,
      createdById: coachV.membershipId,
    },
  });
  await prisma.match.create({
    data: {
      teamId: valorant.id,
      opponentId: opponents[2].id,
      scheduledAt: daysFromNow(4),
      timezone: org.timezone,
      format: "BO3",
      locationType: "ONLINE",
      isStreamed: true,
      streamPlatform: "Twitch",
      streamUrl: "https://twitch.tv/novaesports",
      casterName: "ValCasterPro",
      status: "SCHEDULED",
      createdById: coachV.membershipId,
    },
  });
  await prisma.match.create({
    data: {
      teamId: valorant.id,
      opponentId: opponents[3].id,
      scheduledAt: daysFromNow(18),
      timezone: org.timezone,
      format: "BO5",
      locationType: "LAN",
      venueId: lanCenter.id,
      isStreamed: true,
      streamPlatform: "YouTube",
      streamUrl: "https://youtube.com/novaesports/live",
      casterName: "TBD",
      status: "SCHEDULED",
      notes: "Regional LAN finals — travel logistics TBD.",
      createdById: coachV.membershipId,
    },
  });
  await prisma.match.create({
    data: {
      teamId: rocketLeague.id,
      opponentId: opponents[4].id,
      scheduledAt: daysFromNow(6),
      timezone: org.timezone,
      format: "BO5",
      locationType: "ONLINE",
      isStreamed: false,
      status: "SCHEDULED",
      createdById: coachRL.membershipId,
    },
  });

  console.log("Scheduling practices & scrims…");
  const valorantPracticeRoster = valorantRoster.map((m) => ({ membershipId: m.membershipId }));
  const rlPracticeRoster = rlRoster.map((m) => ({ membershipId: m.membershipId }));

  await prisma.practiceSession.create({
    data: {
      teamId: valorant.id,
      type: "PRACTICE",
      scheduledAt: daysFromNow(1),
      durationMinutes: 90,
      timezone: org.timezone,
      locationType: "ONLINE",
      notes: "VOD review + aim warmup.",
      createdById: coachV.membershipId,
      attendances: {
        create: valorantPracticeRoster.map((r, i) => ({
          membershipId: r.membershipId,
          status: i % 3 === 0 ? "CONFIRMED" : "INVITED",
        })),
      },
    },
  });

  // Deliberately scheduled during a player's stated unavailability, to exercise conflict detection.
  await prisma.practiceSession.create({
    data: {
      teamId: valorant.id,
      type: "SCRIM",
      opponentId: opponents[1].id,
      scheduledAt: daysFromNow(2),
      durationMinutes: 120,
      timezone: org.timezone,
      locationType: "ONLINE",
      createdById: coachV.membershipId,
      attendances: {
        create: valorantPracticeRoster.map((r) => ({ membershipId: r.membershipId, status: "CONFIRMED" })),
      },
    },
  });

  await prisma.practiceSession.create({
    data: {
      teamId: rocketLeague.id,
      type: "PRACTICE",
      scheduledAt: daysFromNow(2),
      durationMinutes: 60,
      timezone: org.timezone,
      locationType: "LAN",
      venueId: orgFacility.id,
      createdById: coachRL.membershipId,
      attendances: {
        create: rlPracticeRoster.map((r) => ({ membershipId: r.membershipId, status: "INVITED" })),
      },
    },
  });

  console.log("Setting player availability…");
  const eveningRules = [
    { dayOfWeek: 1, startTime: "18:00", endTime: "22:00" },
    { dayOfWeek: 2, startTime: "18:00", endTime: "22:00" },
    { dayOfWeek: 3, startTime: "18:00", endTime: "22:00" },
    { dayOfWeek: 6, startTime: "12:00", endTime: "20:00" },
  ];
  for (const member of [...valorantRoster, ...rlRoster]) {
    for (const rule of eveningRules) {
      await prisma.availabilityRule.create({
        data: { membershipId: member.membershipId, timezone: org.timezone, ...rule },
      });
    }
  }
  // One player is unavailable for the scrim scheduled two days out (an exam).
  await prisma.availabilityException.create({
    data: {
      membershipId: playersV[0].membershipId,
      date: daysFromNow(2),
      isAvailable: false,
      reason: "Final exam",
    },
  });

  console.log("Creating recruitment levels…");
  const [hsLevel, collegeLevel, proLevel] = await Promise.all([
    prisma.prospectLevel.create({ data: { orgId: org.id, name: "High School", order: 0 } }),
    prisma.prospectLevel.create({ data: { orgId: org.id, name: "College", order: 1 } }),
    prisma.prospectLevel.create({ data: { orgId: org.id, name: "Pro", order: 2 } }),
  ]);

  console.log("Building recruitment pipeline…");
  const prospectSeed: {
    name: string;
    levelId: string;
    game: string;
    stage: "SCOUTING" | "CONTACTED" | "TRYOUT" | "OFFER" | "SIGNED" | "PASSED";
    schoolOrOrg: string;
    email?: string;
  }[] = [
    { name: "Tyler Brooks", levelId: hsLevel.id, game: "Valorant", stage: "SCOUTING", schoolOrOrg: "Lincoln HS Esports" },
    { name: "Jenna Cole", levelId: hsLevel.id, game: "Valorant", stage: "CONTACTED", schoolOrOrg: "Riverside HS" },
    { name: "Marco Diaz", levelId: collegeLevel.id, game: "Valorant", stage: "TRYOUT", schoolOrOrg: "Midwest State University", email: "marco.d@example.edu" },
    { name: "Sophie Turner", levelId: collegeLevel.id, game: "Rocket League", stage: "OFFER", schoolOrOrg: "Lakeshore College", email: "sophie.t@example.edu" },
    { name: "Kenji Watanabe", levelId: proLevel.id, game: "Valorant", stage: "SIGNED", schoolOrOrg: "Free agent" },
    { name: "Bianca Reyes", levelId: collegeLevel.id, game: "Rocket League", stage: "PASSED", schoolOrOrg: "Union College" },
    { name: "Owen Fisher", levelId: proLevel.id, game: "Rocket League", stage: "SCOUTING", schoolOrOrg: "Free agent" },
    { name: "Grace Lin", levelId: hsLevel.id, game: "Valorant", stage: "TRYOUT", schoolOrOrg: "Central HS Esports" },
  ];

  const stageOrder = ["SCOUTING", "CONTACTED", "TRYOUT", "OFFER", "SIGNED", "PASSED"];
  for (const p of prospectSeed) {
    const targetTeam = p.game === "Valorant" ? valorant.id : rocketLeague.id;
    const finalIndex = stageOrder.indexOf(p.stage);
    const prospect = await prisma.recruitmentProspect.create({
      data: {
        orgId: org.id,
        teamId: targetTeam,
        name: p.name,
        levelId: p.levelId,
        game: p.game,
        stage: p.stage,
        schoolOrOrg: p.schoolOrOrg,
        email: p.email,
        assignedToMembershipId: analyst.membershipId,
        socialLinks: [{ label: "Twitter", url: `https://twitter.com/${p.name.split(" ")[0].toLowerCase()}` }],
      },
    });
    for (let i = 0; i <= finalIndex; i++) {
      await prisma.prospectStatusHistory.create({
        data: {
          prospectId: prospect.id,
          fromStage: i === 0 ? null : (stageOrder[i - 1] as never),
          toStage: stageOrder[i] as never,
          changedById: analyst.membershipId,
          changedAt: daysAgo((finalIndex - i + 1) * 4),
        },
      });
    }
  }

  console.log("Posting announcements…");
  await prisma.announcement.create({
    data: {
      orgId: org.id,
      authorId: owner.membershipId,
      title: "Welcome to Nova Esports on Formation",
      body: "This is our new home base for scheduling, rosters, and recruiting. Set your availability so we can plan practices around everyone's schedule!",
      pinned: true,
    },
  });
  await prisma.announcement.create({
    data: {
      orgId: org.id,
      teamId: valorant.id,
      authorId: coachV.membershipId,
      title: "VOD review Thursday",
      body: "Bring notes from our last scrim — we'll break down the mid-round calls that lost us map 2.",
    },
  });

  console.log("Writing audit log sample entries…");
  await prisma.auditLog.create({
    data: {
      orgId: org.id,
      actorMembershipId: owner.membershipId,
      action: "role.permissions_updated",
      targetType: "Role",
      targetId: roles.Analyst,
      metadata: { name: "Analyst", permissions: ROLE_PRESETS.Analyst.permissions },
    },
  });
  await prisma.auditLog.create({
    data: {
      orgId: org.id,
      actorMembershipId: manager.membershipId,
      action: "invite.created",
      targetType: "Invite",
      targetId: "seed-example",
      metadata: { email: "prospective.player@example.com", role: "Player" },
    },
  });

  console.log("\nSeed complete. Log in with:");
  console.log("  Owner   aaron.santacruz03@gmail.com / password123");
  console.log("  Manager riley.manager@example.com / password123");
  console.log("  Coach   marcus.coach@example.com / password123");
  console.log("  Player  ava.player@example.com / password123");
  console.log("  (all seeded accounts share the password123 password)\n");
  console.log(`API key (Settings → Integrations): ${apiKey}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
