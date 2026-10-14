import { z } from "zod";
import { DEFAULT_ACADEMY } from "./academy-content";
import { parseVideo } from "@/lib/academy-video";
import { DEFAULT_DECOR } from "./decor-content";
import { DEFAULT_SHIFTS } from "./shift-content";
import { DEFAULT_LOCATIONS } from "./location-content";
import { DEFAULT_LEADERSHIP } from "./leadership-content";
import { DEFAULT_HUNT } from "./hunt-content";
import { DEFAULT_CHAT } from "./chat-content";
import { DEFAULT_CLIENTSIM } from "./clientsim-content";
import { NEED_KEYS } from "@/lib/world/player";
import { DECOR_MODELS } from "@/lib/world/types";

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
    /** When on, anyone who opens the admin area (admin, learning and development, reviewer) must have two-step sign-in set up. */
    requireTwoStepForAdminAreas: z.boolean().default(false),
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
    /** Admins can preview the game at any time (so they can test and demo it). Turn off to apply Work First to admins too. */
    adminsExempt: z.boolean().default(true),
    /**
     * Owner decision (13 Oct 2026): people may play during working hours. When false (the default) core
     * hours and the play windows below are NOT enforced and the session limit governs play. Turn on to bring
     * back the older rule: closed in core working hours, open only inside the windows.
     */
    restrictToWindows: z.boolean().default(false),
    /** Max time per session, then a pause before the next one (admin-editable). */
    sessionLimit: z
      .object({
        enabled: z.boolean(),
        maxMinutes: z.number().int().min(1).max(480),
        pauseMinutes: z.number().int().min(0).max(1440),
        /** Owner decision (13 Oct 2026): the limit only applies during working hours. Outside them (evenings, weekends, holidays) there is no session limit. */
        onlyInCoreHours: z.boolean().default(true),
      })
      .strict()
      .default({ enabled: true, maxMinutes: 30, pauseMinutes: 120, onlyInCoreHours: true }),
    /** Apply the daily cap below even when windows are not enforced. Off by default so the session limit governs. */
    dailyCapEnabled: z.boolean().default(false),
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
            /** Only a window flagged true may open inside core working hours (e.g. lunch). Default: it may not. */
            duringCoreHours: z.boolean().optional(),
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
    /** Dates treated like weekends (weekend windows and caps apply, no core hours). */
    publicHolidays: z.array(isoDate).max(60).default([]),
    unitOverrides: z.record(z.string().min(1).max(20), unitOverrideSchema),
  })
  .strict();

/* --------------------------------- placement --------------------------------- */

export const placementSchema = z
  .object({
    enabled: z.boolean(),
    /** Global switch: can people dispute their placement and retake? Admins can also lock per unit or per person. */
    retakeEnabled: z.boolean(),
    maxRetakes: z.number().int().min(0).max(10),
    retakeDisabledUnits: z.array(z.string().min(1).max(20)).max(50),
    paths: z
      .array(
        z
          .object({
            id: slug,
            name: z.string().min(1).max(40),
            emoji: z.string().min(1).max(8),
            blurb: z.string().min(1).max(300),
          })
          .strict(),
      )
      .min(2)
      .max(8),
    questions: z
      .array(
        z
          .object({
            id: slug,
            text: z.string().min(3).max(300),
            options: z
              .array(
                z
                  .object({
                    id: slug,
                    label: z.string().min(1).max(200),
                    scores: z.record(z.string().min(1).max(41), z.number().int().min(-10).max(10)),
                  })
                  .strict(),
              )
              .min(2)
              .max(8),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    /** Cross-check with the staff directory: add points to a path when years at Meristem fall in a range. */
    hints: z
      .array(z.object({ pathId: slug, minYears: z.number().min(0).max(60), maxYears: z.number().min(0).max(60), bonus: z.number().int().min(-10).max(10) }).strict())
      .max(20),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    const pathIds = new Set(cfg.paths.map((p) => p.id));
    if (pathIds.size !== cfg.paths.length) ctx.addIssue({ code: "custom", path: ["paths"], message: "Path ids must be unique" });
    const qIds = new Set<string>();
    cfg.questions.forEach((q, qi) => {
      if (qIds.has(q.id)) ctx.addIssue({ code: "custom", path: ["questions", qi, "id"], message: "Question ids must be unique" });
      qIds.add(q.id);
      const oIds = new Set<string>();
      q.options.forEach((o, oi) => {
        if (oIds.has(o.id)) ctx.addIssue({ code: "custom", path: ["questions", qi, "options", oi, "id"], message: "Option ids must be unique within a question" });
        oIds.add(o.id);
        for (const pid of Object.keys(o.scores)) {
          if (!pathIds.has(pid)) ctx.addIssue({ code: "custom", path: ["questions", qi, "options", oi, "scores", pid], message: `Unknown path "${pid}"` });
        }
      });
    });
    cfg.hints.forEach((h, hi) => {
      if (!pathIds.has(h.pathId)) ctx.addIssue({ code: "custom", path: ["hints", hi, "pathId"], message: `Unknown path "${h.pathId}"` });
      if (h.maxYears < h.minYears) ctx.addIssue({ code: "custom", path: ["hints", hi, "maxYears"], message: "maxYears must be at least minYears" });
    });
  });

const opt = (id: string, label: string, scores: Record<string, number>) => ({ id, label, scores });

export const DEFAULT_PLACEMENT: z.infer<typeof placementSchema> = {
  enabled: true,
  retakeEnabled: true,
  maxRetakes: 2,
  retakeDisabledUnits: [],
  paths: [
    { id: "fresh-start", name: "Fresh Start", emoji: "🌱", blurb: "Interns, entry-level and graduate staff learning the products, procedures and client basics." },
    { id: "new-chapter", name: "New Chapter", emoji: "🔄", blurb: "Experienced people who are new to Meristem: learn how the Group, its policies and systems work." },
    { id: "seasoned", name: "Seasoned", emoji: "🌳", blurb: "Long-serving staff and team leads: leadership, coaching and succession readiness." },
  ],
  questions: [
    {
      id: "experience",
      text: "How many years have you worked in total, in any organisation?",
      options: [
        opt("none", "This is my first job or internship", { "fresh-start": 4 }),
        opt("y1-3", "1 to 3 years", { "fresh-start": 2, "new-chapter": 2 }),
        opt("y3-8", "3 to 8 years", { "new-chapter": 3, seasoned: 1 }),
        opt("y8-plus", "More than 8 years", { "new-chapter": 1, seasoned: 3 }),
      ],
    },
    {
      id: "meristem-time",
      text: "How long have you worked at Meristem?",
      options: [
        opt("new", "Less than 6 months", { "fresh-start": 1, "new-chapter": 3 }),
        opt("y1", "6 months to 3 years", { "fresh-start": 1, "new-chapter": 1, seasoned: 1 }),
        opt("y3-8", "3 to 8 years", { seasoned: 2 }),
        opt("y8-plus", "More than 8 years", { seasoned: 4 }),
      ],
    },
    {
      id: "people",
      text: "Do you lead or manage other people?",
      options: [
        opt("no", "No", { "fresh-start": 2, "new-chapter": 1 }),
        opt("informal", "Informally: I guide teammates or interns", { "new-chapter": 1, seasoned: 1 }),
        opt("direct", "Yes, I have direct reports", { seasoned: 4 }),
        opt("leaders", "Yes, I lead other managers", { seasoned: 5 }),
      ],
    },
    {
      id: "regulated",
      text: "How much regulated work have you done (KYC/AML, suitability, market conduct)?",
      options: [
        opt("never", "None yet", { "fresh-start": 3 }),
        opt("some", "Some, with supervision", { "fresh-start": 1, "new-chapter": 2 }),
        opt("regular", "Regularly, on my own", { "new-chapter": 2, seasoned: 2 }),
        opt("supervise", "I supervise or review it", { seasoned: 3 }),
      ],
    },
    {
      id: "markets",
      text: "How comfortable are you with T-bills, bonds, equities and funds?",
      options: [
        opt("learning", "I am still learning the basics", { "fresh-start": 3 }),
        opt("working", "I understand them and use them at work", { "new-chapter": 2, seasoned: 1 }),
        opt("expert", "I could teach them to others", { seasoned: 3 }),
      ],
    },
    {
      id: "mentoring",
      text: "Have you coached or mentored colleagues?",
      options: [
        opt("no", "Not yet", { "fresh-start": 2, "new-chapter": 1 }),
        opt("sometimes", "Occasionally", { "new-chapter": 1, seasoned: 1 }),
        opt("regularly", "Regularly, it is part of my role", { seasoned: 3 }),
      ],
    },
    {
      id: "learn-first",
      text: "What would help you most right now?",
      options: [
        opt("basics", "Learning the products, procedures and client basics", { "fresh-start": 4 }),
        opt("meristem", "Understanding how Meristem, its policies and systems work", { "new-chapter": 4 }),
        opt("leading", "Developing my leadership and preparing for the next role", { seasoned: 4 }),
      ],
    },
  ],
  hints: [
    { pathId: "seasoned", minYears: 8, maxYears: 60, bonus: 2 },
    { pathId: "fresh-start", minYears: 0, maxYears: 0.5, bonus: 1 },
  ],
};

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
        /** The picture shown for it. */
        icon: z.string().min(1).max(8).default("🚗"),
        /** How long the ride takes on screen, in seconds. */
        rideSeconds: z.number().int().min(3).max(600).default(20),
      })
      .strict(),
  )
  .min(1)
  .max(20);

export const travelSchema = z
  .object({
    settings: z.object({ skipAllowed: z.boolean(), turnBackAllowed: z.boolean() }).strict(),
    /** Things that can happen on the road: how likely each is (a percentage) and the seconds it adds (or takes off). */
    events: z
      .array(z.object({ id: slug, label: z.string().min(1).max(40), icon: z.string().min(1).max(8), chance: z.number().int().min(0).max(100), extraSeconds: z.number().int().min(-60).max(300) }).strict())
      .max(20),
  })
  .strict();

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

/** The apps on the Work Phone. Admins can switch each on or off, rename it, or mark it "coming soon". */
export const phoneAppsSchema = z
  .array(
    z
      .object({
        id: slug,
        label: z.string().min(1).max(30),
        icon: z.string().min(1).max(8),
        enabled: z.boolean(),
        soon: z.boolean(),
      })
      .strict(),
  )
  .min(1)
  .max(40);

const effectsSchema = z
  .object({
    energy: z.number().int().min(-50).max(50).optional(),
    focus: z.number().int().min(-50).max(50).optional(),
    mood: z.number().int().min(-50).max(50).optional(),
    social: z.number().int().min(-50).max(50).optional(),
    hunger: z.number().int().min(-50).max(50).optional(),
    hydration: z.number().int().min(-50).max(50).optional(),
    growth: z.number().int().min(-50).max(50).optional(),
    recognition: z.number().int().min(-50).max(50).optional(),
  })
  .strict();
const decay = z.number().min(0).max(60);
const feelingSchema = z.object({ label: z.string().min(1).max(30), text: z.string().min(1).max(120) }).strict();
const skillGain = z.object({ id: slug, xp: z.number().int().min(1).max(100) }).strict();

/**
 * The needs, interactions, skills and daily missions of the game. Everything a designer may want to tune
 * is here: how fast the bars fall, what each interaction does and costs, the skills and their levels, and
 * the missions in Today's Plan.
 */
export const gameplaySchema = z
  .object({
    /** How much each bar falls for every hour of play. */
    decayPerHour: z.object({ energy: decay, focus: decay, mood: decay, social: decay, hunger: decay, hydration: decay, growth: decay, recognition: decay }).strict(),
    interactions: z
      .array(
        z
          .object({
            id: slug,
            label: z.string().min(1).max(30),
            icon: z.string().min(1).max(8),
            effects: effectsSchema,
            /** Merit points it costs. */
            cost: z.number().int().min(0).max(1000),
            cooldownMinutes: z.number().int().min(0).max(1440),
            feeling: feelingSchema,
            skill: skillGain.optional(),
          })
          .strict(),
      )
      .max(20),
    /**
     * Places in the building where a need can be recharged, one entry for each kind of spot a room can have
     * (coffee, water, lunch, rest, read). A spot in a room is a "hotspot" with the same kind.
     */
    spots: z
      .array(
        z
          .object({
            kind: slug,
            label: z.string().min(1).max(30),
            icon: z.string().min(1).max(8),
            effects: effectsSchema,
            cooldownMinutes: z.number().int().min(0).max(1440),
            feeling: feelingSchema,
            skill: skillGain.optional(),
          })
          .strict(),
      )
      .max(20),
    /** What claiming a mission reward (or the daily bonus) does for the needs. */
    claimEffects: effectsSchema,
    skills: z
      .array(z.object({ id: slug, label: z.string().min(1).max(30), icon: z.string().min(1).max(8), xpPerLevel: z.number().int().min(1).max(10_000), maxLevel: z.number().int().min(1).max(20) }).strict())
      .max(30),
    missions: z
      .array(
        z
          .object({
            id: slug,
            title: z.string().min(1).max(60),
            description: z.string().min(1).max(160),
            /** What counts: an interaction id, "coffee" or "visit" (entering another room). */
            event: slug,
            target: z.number().int().min(1).max(50),
            rewardPoints: z.number().int().min(0).max(1000),
          })
          .strict(),
      )
      .max(40),
    missionsPerDay: z.number().int().min(0).max(10),
    dailyBonusPoints: z.number().int().min(0).max(1000),
    /** Free swaps of a mission each day. */
    swapsPerDay: z.number().int().min(0).max(5).default(1),
    /** Merit points on reaching a day of the 7-day streak (1 to 7). It starts again after day 7. */
    streakRewards: z.array(z.object({ day: z.number().int().min(1).max(7), points: z.number().int().min(0).max(1000) }).strict()).max(7).default([{ day: 3, points: 5 }, { day: 5, points: 8 }, { day: 7, points: 15 }]),
  })
  .strict();

/**
 * Meristem Academy: courses of lessons, each lesson a timed class, then notes, then quizzes at three levels. Everything about
 * how it runs (class time, pass mark, retry delay, classes a day) and every word of every lesson is here, so
 * Compliance and L&D can write and change courses without a developer.
 */
const quizQuestion = z
  .object({
    /** Stays the same when the question is edited, so records of what was asked still make sense. */
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/),
    /** 1 Easy, 2 Medium, 3 Hard. People meet Medium after passing Easy, and Hard after passing Medium. */
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    question: z.string().min(5).max(400),
    options: z.array(z.string().min(1).max(200)).min(2).max(6),
    /** The position of the right option, counting from 0. Never sent to the browser. */
    answer: z.number().int().min(0).max(5),
  })
  .strict()
  .refine((q) => q.answer < q.options.length, "The answer must be one of the options");

const scenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/),
    title: z.string().min(1).max(80),
    story: z.string().min(10).max(1500),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    choices: z
      .array(z.object({ text: z.string().min(1).max(300), verdict: z.enum(["best", "partly", "wrong"]), feedback: z.string().min(1).max(500) }).strict())
      .min(2)
      .max(5),
  })
  .strict()
  .refine((s) => s.choices.some((c) => c.verdict === "best"), "A scenario needs a best choice");

const caseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/),
    title: z.string().min(1).max(80),
    story: z.string().min(10).max(2000),
    /** What a good answer covers: a model answer to compare against. */
    keyPoints: z.array(z.string().min(1).max(300)).max(15),
  })
  .strict();

export const courseSchema = z
  .object({
    id: slug,
    /** The group it sits in. Leave empty to show it under "More courses". */
    group: z.string().max(41),
    title: z.string().min(1).max(60),
    kicker: z.string().min(1).max(40),
    icon: z.string().min(1).max(8),
    intro: z.string().min(1).max(400),
    /** Units this course is recommended for. "*" means everyone. Every course is open to everyone. */
    units: z.array(z.string().min(1).max(40)).min(1).max(30),
    /** Merit points for the certificate (earned by passing every lesson at Hard). */
    rewardPoints: z.number().int().min(0).max(1000),
    certificate: z.string().min(1).max(80),
    skill: skillGain,
    lessons: z
      .array(
        z
          .object({
            id: slug,
            title: z.string().min(1).max(80),
            paragraphs: z.array(z.string().min(1).max(2500)).min(1).max(20),
            /** Optional lesson video: a YouTube, Vimeo or Microsoft 365 link, or a direct https video file. */
            video: z.string().max(500).refine((v) => parseVideo(v) !== null, "Use a YouTube, Vimeo, Microsoft Stream or SharePoint link, or a direct https .mp4 or .webm link").optional(),
            questions: z.array(quizQuestion).min(3).max(120),
          })
          .strict()
          .refine((l) => new Set(l.questions.map((x) => x.id)).size === l.questions.length, "Each question needs its own id"),
      )
      .min(1)
      .max(12)
      .refine((l) => new Set(l.map((x) => x.id)).size === l.length, "Each lesson needs its own id"),
    scenarios: z.array(scenarioSchema).max(20),
    cases: z.array(caseSchema).max(20),
  })
  .strict();

export const academySchema = z
  .object({
    settings: z
      .object({
        /** How long a class lasts in real seconds before the notes open. */
        classSeconds: z.number().int().min(0).max(3600),
        /** How long a class is said to last, for display ("45 min"). */
        classMinutes: z.number().int().min(1).max(480),
        /** Questions in a quiz, drawn from the lesson's pool for the person's level. */
        quizSize: z.number().int().min(3).max(15),
        /** Right answers needed to pass a quiz of the full size (5 of 7 in the design). */
        passCorrect: z.number().int().min(1).max(15),
        /** How long to wait before retrying a failed quiz. */
        retryMinutes: z.number().int().min(0).max(1440),
        classesPerDay: z.number().int().min(1).max(20),
        /** Merit points for passing a lesson at Easy, Medium and Hard. */
        lessonPoints: z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100), z.number().int().min(0).max(100)]),
        /** Merit points for finishing a scenario with its best choice. */
        scenarioPoints: z.number().int().min(0).max(100),
      })
      .strict(),
    /** The shelves courses sit on in the Academy. Admins can add groups and move courses between them. */
    groups: z
      .array(z.object({ id: slug, label: z.string().min(1).max(40), icon: z.string().min(1).max(8) }).strict())
      .min(1)
      .max(20)
      .refine((g) => new Set(g.map((x) => x.id)).size === g.length, "Each group needs its own id"),
  })
  .strict();

/**
 * Who may use each floor of a building. A floor not listed is open to everyone. "closed" keeps everyone out
 * (admins can still preview it); "units" lets in only the listed units.
 */
export const floorsSchema = z
  .array(
    z
      .object({
        level: slug,
        access: z.enum(["open", "closed", "units"]),
        units: z.array(z.string().min(1).max(40)).max(30),
        note: z.string().max(100),
      })
      .strict(),
  )
  .max(30)
  .refine((l) => new Set(l.map((x) => x.level)).size === l.length, "Each floor can be listed once");

/** Conduct concerns: the kinds people can pick, and how much they can send and attach. */
export const concernsSchema = z
  .object({
    categories: z.array(z.object({ id: slug, label: z.string().min(1).max(60) }).strict()).min(1).max(20),
    maxPerDay: z.number().int().min(1).max(50),
    maxFiles: z.number().int().min(0).max(3),
    maxFileMb: z.number().int().min(1).max(2),
  })
  .strict()
  .refine((c) => new Set(c.categories.map((x) => x.id)).size === c.categories.length, "Each kind needs its own id");

export const levelsSchema = z
  .array(z.object({ name: z.string().min(1).max(30), xp: z.number().int().min(0).max(1_000_000) }).strict())
  .min(2)
  .max(30)
  .refine((l) => l.every((x, i) => i === 0 || x.xp > l[i - 1].xp), "XP thresholds must increase");

/* -------------------------------- the registry -------------------------------- */

export const decorSchema = z
  .object({
    settings: z
      .object({
        /** The decoration area, at most the size of the Workspace room (10 by 8 tiles). */
        gridW: z.number().int().min(3).max(10),
        gridD: z.number().int().min(3).max(8),
        maxPlaced: z.number().int().min(1).max(100),
        /** The most any one need's fall can be slowed by the room, as a share. */
        maxHelpPerNeed: z.number().min(0).max(0.9),
      })
      .strict(),
    categories: z.array(z.object({ id: slug, label: z.string().min(1).max(20), icon: z.string().min(1).max(8) }).strict()).min(1).max(12),
    items: z
      .array(
        z
          .object({
            id: slug,
            category: slug,
            name: z.string().min(1).max(40),
            icon: z.string().min(1).max(8),
            w: z.number().int().min(1).max(4),
            d: z.number().int().min(1).max(4),
            stars: z.number().int().min(0).max(3),
            price: z.number().int().min(0).max(100000),
            effect: z.object({ need: z.enum(NEED_KEYS), cut: z.number().min(0.01).max(0.5) }).strict().optional(),
            /** The 3D shape shown in the room (box, desk, chair, sofa, plant, lamp, screen, frame, rug, shelf, table, cabinet). Without one the picture is shown. */
            model: z.enum(DECOR_MODELS).optional(),
            /** The main colour of the shape, like #8a6b4a. */
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #8a6b4a").optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict()
  .refine((d) => new Set(d.items.map((i) => i.id)).size === d.items.length, "Each item needs its own id")
  .refine((d) => d.items.every((i) => d.categories.some((c) => c.id === i.category)), "Every item must belong to a category in the list")
  .refine((d) => d.items.every((i) => i.w <= d.settings.gridW && i.d <= d.settings.gridD), "An item is bigger than the room");

export const shiftsSchema = z
  .object({
    settings: z
      .object({
        /** How long a shift lasts. Short by default; raise it for a longer shift. */
        minutes: z.number().int().min(1).max(480),
        tasksPerShift: z.number().int().min(1).max(12),
        shiftsPerDay: z.number().int().min(1).max(10),
        pointsBest: z.number().int().min(0).max(100),
        pointsPartly: z.number().int().min(0).max(100),
        completionBonus: z.number().int().min(0).max(200),
        skillXpBest: z.number().int().min(0).max(20),
      })
      .strict(),
    tasks: z
      .array(
        z
          .object({
            id: slug,
            /** Units this is for, or "*" for everyone. */
            units: z.array(z.string().min(1).max(30)).min(1).max(10),
            title: z.string().min(1).max(80),
            story: z.string().min(1).max(600),
            skill: slug.optional(),
            choices: z
              .array(z.object({ text: z.string().min(1).max(300), verdict: z.enum(["best", "partly", "wrong"]), feedback: z.string().min(1).max(300) }).strict())
              .min(2)
              .max(4)
              .refine((c) => c.some((x) => x.verdict === "best"), "One choice must be the best"),
          })
          .strict(),
      )
      .min(1)
      .max(200)
      .refine((t) => new Set(t.map((x) => x.id)).size === t.length, "Each situation needs its own id"),
  })
  .strict();

export const locationsSchema = z
  .object({
    rooms: z
      .array(
        z
          .object({
            /** The id of a room in the world. */
            scene: slug,
            status: z.string().max(100),
            zones: z
              .array(
                z
                  .object({
                    id: slug,
                    label: z.string().min(1).max(30),
                    icon: z.string().min(1).max(8),
                    activities: z
                      .array(
                        z
                          .object({
                            id: slug,
                            label: z.string().min(1).max(40),
                            icon: z.string().min(1).max(8),
                            /** How long it takes. */
                            seconds: z.number().int().min(1).max(600),
                            effects: effectsSchema,
                            /** Merit points earned. */
                            points: z.number().int().min(0).max(100),
                            /** Merit points it costs (a fridge, for example). 0 means free. */
                            cost: z.number().int().min(0).max(1000).default(0),
                            cooldownMinutes: z.number().int().min(0).max(1440),
                            feeling: feelingSchema,
                            skill: skillGain.optional(),
                            /** The mission event it counts towards, such as coffee or read. */
                            event: slug.optional(),
                          })
                          .strict(),
                      )
                      .min(1)
                      .max(12),
                  })
                  .strict(),
              )
              .min(1)
              .max(10),
          })
          .strict(),
      )
      .max(60)
      .refine((r) => new Set(r.map((x) => x.scene)).size === r.length, "Each room can be listed once")
      .refine((r) => r.every((x) => new Set(x.zones.flatMap((z) => z.activities.map((a) => a.id))).size === x.zones.flatMap((z) => z.activities).length), "Each activity in a room needs its own id"),
  })
  .strict();

function makeSimSchema(withUnits: boolean) {
  return z
  .object({
    settings: z
      .object({
        /** Decisions in one run. */
        rounds: z.number().int().min(1).max(12),
        startMeter: z.number().int().min(10).max(90),
        runsPerDay: z.number().int().min(1).max(10),
        pointsGreat: z.number().int().min(0).max(200),
        pointsGood: z.number().int().min(0).max(200),
        pointsLearning: z.number().int().min(0).max(200),
        /** Average of the meters needed for a great run, with no meter below the good average. */
        greatAverage: z.number().int().min(1).max(100),
        goodAverage: z.number().int().min(1).max(100),
        /** No meter may end below this for a good run. */
        floor: z.number().int().min(0).max(100),
        /** Line managers must finish a run at least this often (in days). 0 switches the requirement off. */
        leadershipRefreshDays: z.number().int().min(0).max(1000).default(180),
        /** Years at Meristem a person needs before they can be named as a successor. */
        successionMinTenure: z.number().min(0).max(40).default(3),
      })
      .strict(),
    meters: z.array(z.object({ id: slug, label: z.string().min(1).max(24), icon: z.string().min(1).max(8) }).strict()).min(1).max(8),
    scenarios: z
      .array(
        z
          .object({
            id: slug,
            title: z.string().min(1).max(80),
            story: z.string().min(1).max(500),
            /** Units this case is for (used by the client simulation); * means everyone. */
            ...(withUnits ? { units: z.array(z.string().min(1).max(30)).min(1).max(10).default(["*"]) } : {}),
            choices: z
              .array(
                z
                  .object({
                    text: z.string().min(1).max(300),
                    /** Change to each meter, by meter id (-30 to 30). */
                    effects: z.record(slug, z.number().int().min(-30).max(30)),
                    feedback: z.string().min(1).max(300),
                  })
                  .strict(),
              )
              .min(2)
              .max(4),
          })
          .strict(),
      )
      .min(1)
      .max(60)
      .refine((s) => new Set(s.map((x) => x.id)).size === s.length, "Each scenario needs its own id"),
  })
  .strict()
  .refine((d) => d.scenarios.every((s) => s.choices.every((c) => Object.keys(c.effects).every((k) => d.meters.some((m) => m.id === k)))), "A choice changes a meter that is not in the list")
  .refine((d) => d.settings.goodAverage <= d.settings.greatAverage, "The good average cannot be above the great average");
}

export const leadershipSchema = makeSimSchema(false);
export const clientSimSchema = makeSimSchema(true);

export const huntSchema = z
  .object({
    settings: z
      .object({
        /** Minutes after the clue is first shown during which finding it pays the faster reward. */
        fastMinutes: z.number().int().min(1).max(1440),
        pointsFast: z.number().int().min(0).max(1000),
        pointsLater: z.number().int().min(0).max(1000),
      })
      .strict(),
    clues: z
      .array(
        z
          .object({
            id: slug,
            clue: z.string().min(5).max(300),
            /** The id of the room it points to, such as ikoyi-lobby. */
            scene: slug,
            hint: z.string().max(80),
          })
          .strict(),
      )
      .max(100)
      .refine((c) => new Set(c.map((x) => x.id)).size === c.length, "Each clue needs its own id"),
  })
  .strict();

export const chatSchema = z
  .object({
    settings: z
      .object({
        maxLength: z.number().int().min(20).max(1000),
        perMinute: z.number().int().min(1).max(60),
        reportsToHide: z.number().int().min(1).max(20),
        historyLimit: z.number().int().min(10).max(200),
        blockLinks: z.boolean(),
        directMessages: z.boolean(),
      })
      .strict(),
    groups: z
      .array(z.object({ id: slug, label: z.string().min(1).max(40), icon: z.string().min(1).max(8), units: z.array(z.string().min(1).max(30)).min(1).max(10) }).strict())
      .max(40)
      .refine((g) => new Set(g.map((x) => x.id)).size === g.length, "Each group needs its own id"),
    blockedWords: z.array(z.string().min(2).max(40)).max(500),
  })
  .strict();

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
      requireTwoStepForAdminAreas: false,
    },
  },
  workFirst: {
    label: "Work First policy",
    group: "Policy",
    description: "How long people may play at a time (default 30 minutes, then a 2-hour pause), whether working hours and play windows are enforced, caps, blackout periods and unit overrides.",
    schema: workFirstSchema,
    default: {
      enabled: true,
      adminsExempt: true,
      restrictToWindows: false,
      sessionLimit: { enabled: true, maxMinutes: 30, pauseMinutes: 120, onlyInCoreHours: true },
      dailyCapEnabled: false,
      timezone: "Africa/Lagos",
      coreHours: { days: [1, 2, 3, 4, 5], start: "08:30", end: "16:30" },
      windows: [
        { id: "before-work", label: "Before work", days: [1, 2, 3, 4, 5], start: "07:00", end: "08:00" },
        { id: "lunch", label: "Lunch break", days: [1, 2, 3, 4, 5], start: "12:30", end: "13:30", maxMinutes: 30, duringCoreHours: true },
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
      publicHolidays: [],
      unitOverrides: {},
    },
  },
  placement: {
    label: "Starting placement questionnaire",
    group: "Onboarding",
    description:
      "The short questionnaire new users answer at first sign-in. Edit the questions, scores, paths, directory hints, and whether people may dispute and retake.",
    schema: placementSchema,
    default: DEFAULT_PLACEMENT,
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
      { id: "personal-car", label: "Personal car", costPoints: 3, minutes: 45, requiresBooking: false, enabled: true, icon: "🚗", rideSeconds: 25 },
      { id: "pool-car", label: "Official pool car", costPoints: 0, minutes: 50, requiresBooking: true, enabled: true, icon: "🚐", rideSeconds: 40 },
      { id: "ride-hailing", label: "Ride-hailing (e.g. Uber)", costPoints: 6, minutes: 40, requiresBooking: false, enabled: true, icon: "🚕", rideSeconds: 15 },
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
  phoneApps: {
    label: "Work Phone apps",
    group: "Gameplay",
    description: "The apps on the Work Phone: show or hide each one, rename it, or mark it as coming soon.",
    schema: phoneAppsSchema,
    default: [
      { id: "my-role", label: "My Role", icon: "💼", enabled: true, soon: true },
      { id: "messages", label: "Messages", icon: "💬", enabled: true, soon: false },
      { id: "academy", label: "Academy", icon: "🎓", enabled: true, soon: false },
      { id: "todays-plan", label: "Today's Plan", icon: "🎯", enabled: true, soon: false },
      { id: "directory", label: "Directory", icon: "📇", enabled: true, soon: true },
      { id: "kudos", label: "Kudos", icon: "🌟", enabled: true, soon: true },
      { id: "portfolio", label: "My Portfolio", icon: "📈", enabled: true, soon: true },
      { id: "clients", label: "Clients", icon: "🤝", enabled: true, soon: true },
      { id: "market", label: "Market", icon: "🏦", enabled: true, soon: true },
      { id: "compliance", label: "Compliance Desk", icon: "🛡️", enabled: true, soon: true },
      { id: "reports", label: "Reports", icon: "📊", enabled: true, soon: true },
      { id: "settings", label: "Settings", icon: "⚙️", enabled: true, soon: false },
    ],
  },
  gameplay: {
    label: "Needs, interactions, skills and missions",
    group: "Gameplay",
    description: "How fast needs fall, what each interaction does and costs, the skills and their levels, and the daily missions in Today's Plan.",
    schema: gameplaySchema,
    default: {
      decayPerHour: { energy: 8, focus: 10, mood: 4, social: 6, hunger: 12, hydration: 10, growth: 3, recognition: 3 },
      interactions: [
        { id: "hello", label: "Say hello", icon: "👋", effects: { social: 5 }, cost: 0, cooldownMinutes: 30, feeling: { label: "Friendly hello", text: "A warm greeting goes a long way." }, skill: { id: "communication", xp: 2 } },
        { id: "tip", label: "Share a tip", icon: "💡", effects: { social: 6, mood: 2, recognition: 6, growth: 3 }, cost: 0, cooldownMinutes: 60, feeling: { label: "Glad to help", text: "You shared something useful with a colleague." }, skill: { id: "communication", xp: 4 } },
        { id: "support", label: "Call for support", icon: "📞", effects: { focus: 6, social: 3, growth: 4 }, cost: 0, cooldownMinutes: 60, feeling: { label: "Backed up", text: "You asked a colleague to help with a client conversation, and they did." }, skill: { id: "client-care", xp: 6 } },
        { id: "drink", label: "Buy a drink", icon: "🥤", effects: { mood: 8, social: 8, energy: 4, hydration: 10 }, cost: 5, cooldownMinutes: 45, feeling: { label: "Good company", text: "A cold drink and a good chat." }, skill: { id: "communication", xp: 3 } },
      ],
      spots: [
        { kind: "coffee", label: "Coffee break", icon: "☕", effects: { energy: 15, focus: 4, hydration: 4 }, cooldownMinutes: 20, feeling: { label: "Fresh coffee", text: "Just what you needed to carry on." } },
        { kind: "water", label: "Drink some water", icon: "💧", effects: { hydration: 30 }, cooldownMinutes: 10, feeling: { label: "Refreshed", text: "A cool glass of water." } },
        { kind: "lunch", label: "Have lunch", icon: "🍲", effects: { hunger: 40, energy: 8, mood: 4 }, cooldownMinutes: 120, feeling: { label: "Well fed", text: "A proper meal makes the afternoon easier." } },
        { kind: "rest", label: "Take a quiet break", icon: "🛋️", effects: { energy: 20, focus: 8, mood: 4 }, cooldownMinutes: 60, feeling: { label: "Rested", text: "A few quiet minutes, away from the screen." } },
        { kind: "read", label: "Read up", icon: "📚", effects: { growth: 15, focus: 2 }, cooldownMinutes: 30, feeling: { label: "Learning", text: "You picked up something new from the shelf." }, skill: { id: "market-knowledge", xp: 4 } },
      ],
      claimEffects: { recognition: 10, mood: 3 },
      skills: [
        { id: "communication", label: "Communication", icon: "💬", xpPerLevel: 10, maxLevel: 10 },
        { id: "client-care", label: "Client care", icon: "🤝", xpPerLevel: 12, maxLevel: 10 },
        { id: "market-knowledge", label: "Market knowledge", icon: "📈", xpPerLevel: 12, maxLevel: 10 },
        { id: "compliance", label: "Compliance", icon: "🛡️", xpPerLevel: 12, maxLevel: 10 },
        { id: "risk-awareness", label: "Risk awareness", icon: "⚖️", xpPerLevel: 12, maxLevel: 10 },
        { id: "digital-tools", label: "Digital tools", icon: "💻", xpPerLevel: 12, maxLevel: 10 },
      ],
      missions: [
        { id: "greet-three", title: "Greet three colleagues", description: "Say hello to people around the office.", event: "hello", target: 3, rewardPoints: 5 },
        { id: "share-tip", title: "Share a tip", description: "Pass on something useful to a colleague.", event: "tip", target: 1, rewardPoints: 5 },
        { id: "coffee-break", title: "Take a coffee break", description: "Recharge at the coffee point.", event: "coffee", target: 1, rewardPoints: 3 },
        { id: "ask-support", title: "Call for support", description: "Ask a colleague to help on a client conversation.", event: "support", target: 1, rewardPoints: 6 },
        { id: "explore", title: "Explore the office", description: "Visit two other rooms.", event: "visit", target: 2, rewardPoints: 4 },
        { id: "buy-drink", title: "Buy a colleague a drink", description: "Treat someone in the lounge.", event: "drink", target: 1, rewardPoints: 4 },
        { id: "pass-lesson", title: "Pass a lesson", description: "Attend a class in Meristem Academy and pass the quiz.", event: "lesson", target: 1, rewardPoints: 8 },
        { id: "proper-lunch", title: "Have a proper lunch", description: "Step away from your desk and eat in the pantry.", event: "lunch", target: 1, rewardPoints: 4 },
        { id: "stay-hydrated", title: "Stay hydrated", description: "Drink water at the cooler.", event: "water", target: 1, rewardPoints: 3 },
        { id: "read-up", title: "Read up", description: "Pick something to read from the shelf.", event: "read", target: 1, rewardPoints: 4 },
        { id: "quiet-break", title: "Take a quiet break", description: "Rest for a few minutes in the lounge.", event: "rest", target: 1, rewardPoints: 3 },
        { id: "work-shift", title: "Finish a work shift", description: "Complete a Go-to-work shift.", event: "shift", target: 1, rewardPoints: 6 },
        { id: "lead-run", title: "Lead a team", description: "Finish a run of the leadership simulator.", event: "lead", target: 1, rewardPoints: 6 },
        { id: "client-run", title: "Serve a client", description: "Finish a run of the client simulation.", event: "sim", target: 1, rewardPoints: 6 },
        { id: "find-clue", title: "Find today's clue", description: "Walk to the room the daily clue points to.", event: "clue", target: 1, rewardPoints: 5 },
        { id: "make-yours", title: "Make your space yours", description: "Buy or place something in your Workspace.", event: "decorate", target: 1, rewardPoints: 4 },
        { id: "say-hi-chat", title: "Send a message", description: "Post a kind message on the Work Phone.", event: "chat", target: 1, rewardPoints: 3 },
        { id: "two-lessons", title: "Learn twice", description: "Pass two lessons in Meristem Academy.", event: "lesson", target: 2, rewardPoints: 12 },
        { id: "greet-five", title: "Greet five colleagues", description: "Be the friendliest person on the floor.", event: "hello", target: 5, rewardPoints: 8 },
        { id: "tip-three", title: "Share three tips", description: "Pass on three useful tips.", event: "tip", target: 3, rewardPoints: 9 },
        { id: "support-two", title: "Support two colleagues", description: "Offer support twice.", event: "support", target: 2, rewardPoints: 6 },
        { id: "drink-two", title: "Treat two colleagues", description: "Buy two colleagues a drink.", event: "drink", target: 2, rewardPoints: 7 },
        { id: "travel-two", title: "Visit four rooms", description: "Walk through four different rooms.", event: "visit", target: 4, rewardPoints: 7 },
        { id: "two-reads", title: "Read twice", description: "Pick two things to read today.", event: "read", target: 2, rewardPoints: 7 },
        { id: "hydrate-twice", title: "Drink water twice", description: "Stay hydrated through the day.", event: "water", target: 2, rewardPoints: 5 },
        { id: "two-breaks", title: "Take two breaks", description: "Rest twice to stay fresh.", event: "rest", target: 2, rewardPoints: 5 },
        { id: "two-coffees", title: "Two coffee chats", description: "Have two coffee chats with colleagues.", event: "coffee", target: 2, rewardPoints: 5 },
        { id: "two-shifts", title: "Two shifts in a day", description: "Finish two work shifts.", event: "shift", target: 2, rewardPoints: 10 },
        { id: "two-clients", title: "Serve two clients", description: "Finish two client simulation runs.", event: "sim", target: 2, rewardPoints: 10 },
        { id: "chat-three", title: "Keep in touch", description: "Send three messages on the Work Phone.", event: "chat", target: 3, rewardPoints: 5 },
        { id: "decorate-three", title: "Decorate your Workspace", description: "Buy or place three things.", event: "decorate", target: 3, rewardPoints: 7 },
        { id: "lunch-and-water", title: "Look after yourself", description: "Eat a proper lunch today.", event: "lunch", target: 1, rewardPoints: 5 },
      ],
      missionsPerDay: 3,
      dailyBonusPoints: 10,
      swapsPerDay: 1,
      streakRewards: [{ day: 3, points: 5 }, { day: 5, points: 8 }, { day: 7, points: 15 }],
    },
  },
  academy: {
    label: "Meristem Academy",
    group: "Content",
    description: "How Meristem Academy runs (class time, quiz size, pass mark, retry delay, classes a day, points) and the groups courses sit in. The courses themselves are edited under Admin → Academy.",
    schema: academySchema,
    default: DEFAULT_ACADEMY,
  },
  decor: {
    label: "Workspace catalogue",
    group: "Content",
    description: "What people can buy with Merit points to decorate their Workspace: the room size, the tabs, and each item (size, stars, price, and an optional help to a need, as a share by which that need falls more slowly). People choose whether to place things themselves or have them placed.",
    schema: decorSchema,
    default: DEFAULT_DECOR,
  },
  shifts: {
    label: "Work shifts",
    group: "Content",
    description: "Go to work: how long a shift lasts (minutes), how many situations come up, how many shifts a day, the points, and the situations themselves for each unit (use * for everyone). A shift is only paid when the person stays to the end.",
    schema: shiftsSchema,
    default: DEFAULT_SHIFTS,
  },
  locations: {
    label: "Room activities",
    group: "World",
    description: "The location bar in each room: its zones as tabs, and the timed activities in each zone (how long, which needs it lifts, Merit points, how soon it can be repeated). The room is named by its id, such as ikoyi-floor.",
    schema: locationsSchema,
    default: DEFAULT_LOCATIONS,
  },
  leadership: {
    label: "Leadership simulator",
    group: "Content",
    description: "The people-management decisions in the leadership simulator: the meters (such as team morale), the scenarios and what each choice does to the meters, how a run is rated, and the Merit points.",
    schema: leadershipSchema,
    default: DEFAULT_LEADERSHIP,
  },
  hunt: {
    label: "Daily clue",
    group: "Content",
    description: "The daily clue: a riddle that points to a room. Finding the room earns Merit points, more if found within the first minutes after the clue is shown. Each person gets the same clue all day and a different one each day.",
    schema: huntSchema,
    default: DEFAULT_HUNT,
  },
  clientsim: {
    label: "Client simulation",
    group: "Content",
    description: "Client cases for Customer Experience, Wealth Advisory and Investment Advisory (use * for everyone): the meters, the cases with the units they are for, what each choice does, how a run is rated and the Merit points.",
    schema: clientSimSchema,
    default: DEFAULT_CLIENTSIM,
  },
  chat: {
    label: "Chats and groups",
    group: "Safety",
    description: "Colleague chats: the groups people can join (use * for everyone), whether direct messages are on, message length and speed limits, how many reports hide a message, whether links are blocked, and the list of blocked words. Reported messages are reviewed under Admin → Concerns.",
    schema: chatSchema,
    default: DEFAULT_CHAT,
  },
  travel: {
    label: "Travel",
    group: "World",
    description: "Travel between offices: whether people may skip a ride or turn back, and the things that can happen on the road (a go-slow, rain) with how likely they are and how many seconds they add. The vehicles and their costs are under Transport options.",
    schema: travelSchema,
    default: {
      settings: { skipAllowed: true, turnBackAllowed: true },
      events: [
        { id: "go-slow", label: "Serious go-slow", icon: "🚦", chance: 30, extraSeconds: 10 },
        { id: "rain", label: "Rain", icon: "🌧️", chance: 20, extraSeconds: 5 },
        { id: "clear", label: "Clear roads", icon: "🌤️", chance: 20, extraSeconds: -3 },
      ],
    },
  },
  floors: {
    label: "Floor access",
    group: "World",
    description: "Which floors of Ikoyi HQ staff can go to in the lift. A floor that is not listed is open to everyone. Floor 2 is closed for now.",
    schema: floorsSchema,
    default: [{ level: "floor-2", access: "closed", units: [], note: "Floor 2 is restricted for now." }],
  },
  concerns: {
    label: "Conduct concerns",
    group: "Safety",
    description: "The kinds of concern people can report to the admin team, how many they can send a day, and how much evidence they can attach (at most 3 files of 2 MB).",
    schema: concernsSchema,
    default: {
      categories: [
        { id: "harassment", label: "Harassment or unwelcome behaviour" },
        { id: "bullying", label: "Bullying or intimidation" },
        { id: "discrimination", label: "Discrimination" },
        { id: "language", label: "Offensive language or messages" },
        { id: "safety", label: "Safety or wellbeing" },
        { id: "misconduct", label: "Fraud, bribery or other misconduct" },
        { id: "other", label: "Something else" },
      ],
      maxPerDay: 5,
      maxFiles: 3,
      maxFileMb: 2,
    },
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
