import { z } from "zod";

/**
 * Config registry definitions (RULEBOOK §4: nothing an admin may want to change is hardcoded).
 * Each key has a strict schema and a seeded default. Admins edit values at runtime; code only
 * ships the defaults. Safe to import anywhere (no secrets, no server-only APIs).
 */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");
const dayNum = z.number().int().min(0).max(6); // 0 = Sunday ... 6 = Saturday
const slug = z.string().regex(/^[a-z][a-z0-9-]{0,40}$/, "lowercase letters, digits and dashes");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/* ------------------------------- terminology ------------------------------- */

export const terminologySchema = z
  .object({
    workspace: z.string().min(1).max(40),
    workPhone: z.string().min(1).max(40),
    points: z.string().min(1).max(40),
    spark: z.string().min(1).max(40),
    rep: z.string().min(1).max(40),
    todaysPlan: z.string().min(1).max(40),
    discovery: z.string().min(1).max(40),
    academy: z.string().min(1).max(40),
    stories: z.string().min(1).max(40),
    boosts: z.string().min(1).max(40),
    moods: z.string().min(1).max(40),
    careerDream: z.string().min(1).max(40),
    aspirations: z.string().min(1).max(40),
  })
  .strict();

/* ----------------------------------- auth ----------------------------------- */

export const authSchema = z
  .object({
    allowedEmailDomains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1).max(10),
    staffIdPrefix: z.string().regex(/^[A-Z]{1,6}$/),
    staffIdDigits: z.number().int().min(3).max(8),
    staffIdExample: z.string().min(2).max(20),
    passwordMinLength: z.number().int().min(8).max(64),
    passwordNeedLetter: z.boolean(),
    passwordNeedNumber: z.boolean(),
    passwordNeedSymbol: z.boolean(),
    maxFailedAttempts: z.number().int().min(3).max(10),
    lockMinutes: z.number().int().min(1).max(1440),
    sessionHours: z.number().int().min(1).max(24),
    idleMinutes: z.number().int().min(5).max(480),
  })
  .strict();

/* --------------------------------- work first --------------------------------- */

const unitOverrideSchema = z
  .object({
    coreHours: z.object({ days: z.array(dayNum).max(7), start: hhmm, end: hhmm }).strict().optional(),
    dailyCapWorkdayMinutes: z.number().int().min(0).max(600).optional(),
    dailyCapWeekendMinutes: z.number().int().min(0).max(600).optional(),
  })
  .strict();

export const workFirstSchema = z
  .object({
    enabled: z.boolean(),
    timezone: z.string().min(1).max(60),
    coreHours: z.object({ days: z.array(dayNum).max(7), start: hhmm, end: hhmm }).strict(),
    windows: z
      .array(
        z
          .object({
            id: slug,
            label: z.string().min(1).max(60),
            days: z.array(dayNum).min(1).max(7),
            start: hhmm,
            end: hhmm,
            maxMinutes: z.number().int().min(1).max(600).optional(),
          })
          .strict(),
      )
      .max(20),
    dailyCapWorkdayMinutes: z.number().int().min(0).max(600),
    dailyCapWeekendMinutes: z.number().int().min(0).max(600),
    weeklySoftCapMinutes: z.number().int().min(0).max(3000),
    nudgeAtMinutes: z.number().int().min(0).max(600),
    assignedLearningMinutesPerWeek: z.number().int().min(0).max(1200),
    learningAllowedOutsideCoreHours: z.boolean(),
    idleAwayMinutes: z.number().int().min(1).max(60),
    streakFreezesPerWeek: z.number().int().min(0).max(7),
    blackoutPeriods: z
      .array(z.object({ id: slug, label: z.string().min(1).max(80), from: isoDate, to: isoDate }).strict())
      .max(60),
    unitOverrides: z.record(z.string().min(1).max(20), unitOverrideSchema),
  })
  .strict();

/* ----------------------------------- places ----------------------------------- */

export const officesSchema = z
  .array(
    z
      .object({
        id: slug,
        name: z.string().min(1).max(60),
        city: z.string().min(1).max(40),
        enabled: z.boolean(),
        drivingZone: slug, // offices in the same zone need no inter-city travel; different Lagos offices need a drive
      })
      .strict(),
  )
  .min(1)
  .max(30);

export const transportSchema = z
  .array(
    z
      .object({
        id: slug,
        label: z.string().min(1).max(60),
        costPoints: z.number().int().min(0).max(100000),
        minutes: z.number().int().min(0).max(600),
        requiresBooking: z.boolean(),
        enabled: z.boolean(),
      })
      .strict(),
  )
  .min(1)
  .max(20);

/* --------------------------------- regulators --------------------------------- */

export const regulatorsSchema = z
  .array(
    z
      .object({
        id: slug,
        name: z.string().min(1).max(30),
        fullName: z.string().min(1).max(120),
        role: z.string().min(1).max(300),
        status: z.enum(["unverified", "confirmed"]),
        enabled: z.boolean(),
      })
      .strict(),
  )
  .min(1)
  .max(60);

/* ----------------------------------- gameplay ----------------------------------- */

export const workStylesSchema = z
  .array(
    z
      .object({
        id: slug,
        label: z.string().min(1).max(40),
        blurb: z.string().min(1).max(200),
        performanceMultiplier: z.number().min(0).max(2),
        energyCost: z.number().int().min(-50).max(50),
        socialDelta: z.number().int().min(-50).max(50),
        enabled: z.boolean(),
      })
      .strict(),
  )
  .min(1)
  .max(12);

export const levelsSchema = z
  .array(z.object({ name: z.string().min(1).max(30), xp: z.number().int().min(0).max(1_000_000) }).strict())
  .min(2)
  .max(30)
  .refine((l) => l.every((x, i) => i === 0 || x.xp > l[i - 1].xp), "XP thresholds must increase");

/* -------------------------------- the registry -------------------------------- */

export const CONFIG = {
  terminology: {
    label: "Terminology",
    group: "Content",
    description: "The names the game uses (Workspace, Merit points, Academy…).",
    schema: terminologySchema,
    default: {
      workspace: "Workspace",
      workPhone: "Work Phone",
      points: "Merit points",
      spark: "Spark",
      rep: "Meristem Rep",
      todaysPlan: "Today's Plan",
      discovery: "Daily Discovery",
      academy: "Meristem Academy",
      stories: "Meristem Stories",
      boosts: "Boosts",
      moods: "Moods",
      careerDream: "Career Dream",
      aspirations: "Aspirations",
    },
  },
  auth: {
    label: "Sign-in and security",
    group: "Security",
    description: "Staff ID format, email domains, password rules, lockout and session length.",
    schema: authSchema,
    default: {
      allowedEmailDomains: ["meristemng.com"],
      staffIdPrefix: "MS",
      staffIdDigits: 4,
      staffIdExample: "MS1001",
      passwordMinLength: 10,
      passwordNeedLetter: true,
      passwordNeedNumber: true,
      passwordNeedSymbol: false,
      maxFailedAttempts: 5,
      lockMinutes: 15,
      sessionHours: 8,
      idleMinutes: 60,
    },
  },
  workFirst: {
    label: "Work First policy",
    group: "Policy",
    description: "When people may play, daily and weekly caps, blackout periods and unit overrides. Work always comes first.",
    schema: workFirstSchema,
    default: {
      enabled: true,
      timezone: "Africa/Lagos",
      coreHours: { days: [1, 2, 3, 4, 5], start: "08:00", end: "17:00" },
      windows: [
        { id: "before-work", label: "Before work", days: [1, 2, 3, 4, 5], start: "07:00", end: "08:00" },
        { id: "lunch", label: "Lunch break", days: [1, 2, 3, 4, 5], start: "12:30", end: "13:30", maxMinutes: 30 },
        { id: "after-hours", label: "After hours", days: [1, 2, 3, 4, 5], start: "17:30", end: "21:00" },
        { id: "weekend", label: "Weekend", days: [0, 6], start: "09:00", end: "20:00" },
      ],
      dailyCapWorkdayMinutes: 45,
      dailyCapWeekendMinutes: 90,
      weeklySoftCapMinutes: 240,
      nudgeAtMinutes: 30,
      assignedLearningMinutesPerWeek: 120,
      learningAllowedOutsideCoreHours: true,
      idleAwayMinutes: 3,
      streakFreezesPerWeek: 1,
      blackoutPeriods: [],
      unitOverrides: {},
    },
  },
  offices: {
    label: "Offices",
    group: "World",
    description: "Office locations. Build 1 is Lagos only (Ikoyi HQ and Yaba).",
    schema: officesSchema,
    default: [
      { id: "ikoyi-hq", name: "Ikoyi HQ", city: "Lagos", enabled: true, drivingZone: "lagos" },
      { id: "yaba", name: "Yaba", city: "Lagos", enabled: true, drivingZone: "lagos" },
      { id: "abuja", name: "Abuja", city: "Abuja", enabled: false, drivingZone: "abuja" },
      { id: "port-harcourt", name: "Port Harcourt", city: "Port Harcourt", enabled: false, drivingZone: "port-harcourt" },
    ],
  },
  transport: {
    label: "Transport options",
    group: "World",
    description: "How staff travel between Lagos offices or to client sites. Costs are in Merit points.",
    schema: transportSchema,
    default: [
      { id: "personal-car", label: "Personal car", costPoints: 150, minutes: 45, requiresBooking: false, enabled: true },
      { id: "pool-car", label: "Official pool car", costPoints: 0, minutes: 50, requiresBooking: true, enabled: true },
      { id: "ride-hailing", label: "Ride-hailing (e.g. Uber)", costPoints: 400, minutes: 40, requiresBooking: false, enabled: true },
    ],
  },
  regulators: {
    label: "Regulators",
    group: "Compliance",
    description: "Regulator library. Group Compliance must validate each entry; unconfirmed entries stay out of assessed content. Meristem is not in pensions or insurance.",
    schema: regulatorsSchema,
    default: [
      { id: "sec", name: "SEC", fullName: "Securities and Exchange Commission, Nigeria", role: "Capital market conduct, registration of firms and sponsored individuals, rules on advisers and dealing.", status: "unverified", enabled: true },
      { id: "ngx", name: "NGX", fullName: "Nigerian Exchange Group", role: "Listing and trading rules for equities and other instruments.", status: "unverified", enabled: true },
      { id: "cbn", name: "CBN", fullName: "Central Bank of Nigeria", role: "Major regulator for Meristem Finance Limited (MFL); monetary policy, FX and financial-institution rules.", status: "unverified", enabled: true },
      { id: "fmdq", name: "FMDQ", fullName: "FMDQ Securities Exchange", role: "Fixed income, currency and derivatives market rules.", status: "unverified", enabled: true },
      { id: "cscs", name: "CSCS", fullName: "Central Securities Clearing System", role: "Depository, clearing and settlement.", status: "unverified", enabled: true },
      { id: "ndpc", name: "NDPC", fullName: "Nigeria Data Protection Commission", role: "Data protection under the NDPA 2023: lawful basis, data subject rights, breach notification.", status: "unverified", enabled: true },
      { id: "cac", name: "CAC", fullName: "Corporate Affairs Commission", role: "Company registration, filings and corporate governance requirements.", status: "unverified", enabled: true },
      { id: "ndic", name: "NDIC", fullName: "Nigeria Deposit Insurance Corporation", role: "Deposit insurance. Compliance to confirm relevance to MFL.", status: "unverified", enabled: true },
      { id: "nfiu", name: "NFIU", fullName: "Nigerian Financial Intelligence Unit", role: "Receives suspicious transaction and currency reports.", status: "unverified", enabled: true },
      { id: "efcc", name: "EFCC", fullName: "Economic and Financial Crimes Commission", role: "Financial crime enforcement.", status: "unverified", enabled: true },
      { id: "fccpc", name: "FCCPC", fullName: "Federal Competition and Consumer Protection Commission", role: "Consumer protection and fair competition.", status: "unverified", enabled: true },
      { id: "nitda", name: "NITDA", fullName: "National Information Technology Development Agency", role: "IT standards and guidelines.", status: "unverified", enabled: true },
      { id: "tax", name: "Tax authority", fullName: "Federal tax authority (FIRS/NRS)", role: "Tax filings, withholding and remittances.", status: "unverified", enabled: true },
      { id: "ist", name: "IST", fullName: "Investments and Securities Tribunal", role: "Adjudication of capital market disputes.", status: "unverified", enabled: true },
      { id: "fatf", name: "FATF", fullName: "Financial Action Task Force", role: "International AML/CFT standards that shape local rules.", status: "unverified", enabled: true },
      { id: "iosco", name: "IOSCO", fullName: "International Organization of Securities Commissions", role: "International securities regulation standards.", status: "unverified", enabled: true },
    ],
  },
  workStyles: {
    label: "Work styles",
    group: "Gameplay",
    description: "The style a player picks at the start of a shift (professional versions of the Lagos Life styles).",
    schema: workStylesSchema,
    default: [
      { id: "steady", label: "Steady pace", blurb: "Do your work at a sustainable pace.", performanceMultiplier: 1, energyCost: 10, socialDelta: 0, enabled: true },
      { id: "push", label: "Push hard", blurb: "Big output, but it drains energy.", performanceMultiplier: 1.3, energyCost: 25, socialDelta: -5, enabled: true },
      { id: "collaborate", label: "Collaborate", blurb: "Work with colleagues; output is slower but relationships grow.", performanceMultiplier: 0.85, energyCost: 8, socialDelta: 15, enabled: true },
      { id: "visible", label: "Stay visible", blurb: "Update your manager and stakeholders often. It helps if you deliver, and costs you if you don't.", performanceMultiplier: 0.95, energyCost: 12, socialDelta: 5, enabled: true },
      { id: "pace-yourself", label: "Pace yourself", blurb: "Protect your energy. Output drops.", performanceMultiplier: 0.7, energyCost: 3, socialDelta: 0, enabled: true },
    ],
  },
  levels: {
    label: "Growth levels",
    group: "Gameplay",
    description: "Level names and the XP needed for each (Seed to Canopy).",
    schema: levelsSchema,
    default: [
      { name: "Seed", xp: 0 },
      { name: "Sprout", xp: 80 },
      { name: "Stem", xp: 180 },
      { name: "Branch", xp: 300 },
      { name: "Canopy", xp: 440 },
    ],
  },
} as const;

export type ConfigKey = keyof typeof CONFIG;
export type ConfigValue<K extends ConfigKey> = z.infer<(typeof CONFIG)[K]["schema"]>;

export const CONFIG_KEYS = Object.keys(CONFIG) as ConfigKey[];

export function isConfigKey(k: string): k is ConfigKey {
  return Object.prototype.hasOwnProperty.call(CONFIG, k);
}
