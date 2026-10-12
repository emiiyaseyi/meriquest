/*
 * MeriQuest — sign-in settings (PROTOTYPE)
 *
 * ⚠️ Prototype only. Everything here runs in the browser, so this is a mock of the real flow
 * for demos and playtests. In production:
 *   - sign-in (staff ID/email + password) is checked on the server, never in the browser;
 *   - the default password is a server-side secret (env variable / admin setting), never in front-end code;
 *   - passwords are hashed server-side with a slow hash (Argon2id/bcrypt).
 * Change `defaultPassword` before sharing the prototype with anyone.
 */
window.MERIQUEST_AUTH_CONFIG = {
  // Work email domains accepted on the sign-in page
  allowedEmailDomains: ["meristemng.com"],
  // Staff ID format, e.g. MS1001 (case-insensitive)
  staffIdPattern: "^MS\\d{4}$",
  staffIdExample: "MS1001",

  // Every new or reset account signs in with this, then must choose their own password
  defaultPassword: "Meristem@2026",

  passwordRules: { minLength: 8, needLetter: true, needNumber: true },
  maxFailedAttempts: 5, // then the account locks
  lockMinutes: 15,
  sessionHours: 8, // signed-in session length on this device
};
