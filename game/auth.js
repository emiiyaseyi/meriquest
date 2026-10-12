/*
 * MeriQuest — sign-in, password change and admin panel (PROTOTYPE)
 *
 * Mock of the production flow, running entirely in the browser:
 *   - staff sign in with staff ID or work email + password;
 *   - new/reset accounts use the default password and must set their own at first sign-in;
 *   - passwords are stored salted + hashed (SHA-256) on this device, never in plain text;
 *   - accounts lock after repeated failed attempts;
 *   - admins manage staff: reset password, unlock, enable/disable, roles, add/import/export.
 * In production all of this moves server-side (or to company SSO). See auth-config.js.
 */
(function () {
  "use strict";

  const CFG = window.MERIQUEST_AUTH_CONFIG;
  const SEED = window.MERIQUEST_STAFF_SEED || [];
  const K = { dir: "meriquest.directory.v1", cred: "meriquest.creds.v1", session: "meriquest.session.v1", audit: "meriquest.audit.v1" };
  const UNITS = { cx: "Customer Experience", wealth: "Wealth Advisory", invest: "Investment Advisory", ld: "Learning & Development", other: "Other" };
  const SEGMENTS = { front: "Front Office", middle: "Middle Office", back: "Back Office" };
  const ROLES = { player: "Staff", manager: "Manager", admin: "Admin" };
  const TRACKS = { seedling: "Seedling (intern)", starlet: "Starlet Sprint (MSP)", welcome: "Welcome Aboard (induction)", canopy: "Canopy (team lead)" };

  const app = document.getElementById("app");
  const mem = {};
  const get = (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : k in mem ? mem[k] : d; } catch (e) { return k in mem ? mem[k] : d; } };
  const put = (k, v) => { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* in-memory only */ } };
  const del = (k) => { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  const when = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

  /* ---------------- data ---------------- */
  function directory() {
    let d = get(K.dir, null);
    if (!d) { d = SEED.map((s) => ({ ...s, status: "active" })); put(K.dir, d); }
    return d;
  }
  const saveDir = (d) => put(K.dir, d);
  const creds = () => get(K.cred, {});
  const saveCreds = (c) => put(K.cred, c);
  function audit(by, action, target) {
    const a = get(K.audit, []);
    a.unshift({ at: new Date().toISOString(), by, action, target });
    put(K.audit, a.slice(0, 300));
  }
  const findBy = (identifier) => { const id = norm(identifier); return directory().find((u) => norm(u.staffId) === id || norm(u.email) === id); };
  const byId = (staffId) => directory().find((u) => u.staffId === staffId);

  function identifierError(v) {
    v = String(v || "").trim();
    if (!v) return "Enter your staff ID or work email.";
    if (v.includes("@")) {
      const domain = v.split("@").pop().toLowerCase();
      return CFG.allowedEmailDomains.includes(domain) ? null : `Use your work email address (@${CFG.allowedEmailDomains[0]}).`;
    }
    return new RegExp(CFG.staffIdPattern, "i").test(v) ? null : `Staff IDs look like ${CFG.staffIdExample}.`;
  }

  /* ---------------- passwords ---------------- */
  async function hashPw(pw, salt) {
    const data = new TextEncoder().encode(salt + ":" + pw);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Non-secure contexts (e.g. opened from file://) have no WebCrypto: weak fallback, prototype only.
    let h = 0x811c9dc5;
    for (const b of data) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return "fnv" + h.toString(16);
  }
  function newSalt() {
    const a = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.floor(Math.random() * 256)));
    return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // No stored hash = account is on the default password.
  const onDefault = (staffId) => { const c = creds()[staffId]; return !c || !c.hash || c.mustChange; };
  const isLocked = (staffId) => { const c = creds()[staffId]; return !!(c && c.lockedUntil && Date.now() < c.lockedUntil); };

  async function signIn(identifier, pw) {
    const err = identifierError(identifier);
    if (err) return { error: err };
    const generic = "Staff ID/email or password is incorrect.";
    const user = findBy(identifier);
    if (!user) return { error: generic };
    if (user.status === "disabled") return { error: "This account is disabled. Please contact the L&D admin." };
    const all = creds(), c = all[user.staffId] || {};
    if (c.lockedUntil && Date.now() < c.lockedUntil) {
      return { error: `This account is locked after too many attempts. Try again in ${Math.ceil((c.lockedUntil - Date.now()) / 60000)} min, or ask the L&D admin to unlock it.` };
    }
    if (c.lockedUntil) { delete c.lockedUntil; c.failed = 0; }
    const ok = c.hash ? (await hashPw(pw, c.salt)) === c.hash : pw === CFG.defaultPassword;
    if (!ok) {
      c.failed = (c.failed || 0) + 1;
      if (c.failed >= CFG.maxFailedAttempts) {
        c.lockedUntil = Date.now() + CFG.lockMinutes * 60000;
        c.failed = 0;
        audit("system", "Account locked after failed sign-in attempts", user.staffId);
      }
      all[user.staffId] = c; saveCreds(all);
      return { error: c.lockedUntil ? `Too many failed attempts. This account is locked for ${CFG.lockMinutes} minutes.` : generic };
    }
    c.failed = 0; c.lastLogin = new Date().toISOString();
    all[user.staffId] = c; saveCreds(all);
    return { user, mustChange: !c.hash || !!c.mustChange };
  }

  function passwordProblem(user, pw, confirm) {
    const R = CFG.passwordRules, need = [];
    if (pw.length < R.minLength) need.push(`at least ${R.minLength} characters`);
    if (R.needLetter && !/[a-z]/i.test(pw)) need.push("a letter");
    if (R.needNumber && !/\d/.test(pw)) need.push("a number");
    if (need.length) return "Your password needs " + need.join(", ") + ".";
    if (pw === CFG.defaultPassword) return "Choose a password that's different from the default password.";
    if (norm(pw).includes(norm(user.staffId))) return "Don't include your staff ID in your password.";
    if (pw !== confirm) return "The two passwords don't match.";
    return null;
  }
  async function setPassword(user, pw) {
    const all = creds(), salt = newSalt();
    all[user.staffId] = { ...(all[user.staffId] || {}), salt, hash: await hashPw(pw, salt), mustChange: false, changedAt: new Date().toISOString(), failed: 0 };
    delete all[user.staffId].lockedUntil;
    saveCreds(all);
  }

  /* ---------------- session ---------------- */
  function current() {
    const s = get(K.session, null);
    if (!s || Date.now() > s.exp) return null;
    const u = byId(s.staffId);
    return u && u.status !== "disabled" ? u : null;
  }
  const startSession = (u) => put(K.session, { staffId: u.staffId, exp: Date.now() + CFG.sessionHours * 3600000 });

  let onReady = null;
  function boot(cb) {
    onReady = cb;
    const u = current();
    if (u && !onDefault(u.staffId)) cb(u); else renderSignIn();
  }
  function signOut(msg) { del(K.session); renderSignIn(msg || "You've signed out."); }

  /* ---------------- screens ---------------- */
  const brand = `<div class="brand big"><span class="logo">🌿</span><span>MeriQuest</span><span class="draft">Prototype</span></div>`;

  function renderSignIn(note) {
    pending = null;
    app.innerHTML = `
      <main class="auth-wrap">
        <div class="auth-card">
          ${brand}
          <h1 class="auth-h">Sign in</h1>
          <p class="muted">Use your staff ID or your work email address.</p>
          ${note ? `<div class="auth-note">${esc(note)}</div>` : ""}
          <form id="auth-signin" novalidate>
            <label class="lbl" for="auth-id">Staff ID or work email</label>
            <input id="auth-id" class="input" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="${esc(CFG.staffIdExample)} or name@${esc(CFG.allowedEmailDomains[0])}" />
            <label class="lbl" for="auth-pw">Password</label>
            <div class="pw-wrap"><input id="auth-pw" class="input" type="password" autocomplete="current-password" /><button type="button" class="pw-toggle" data-auth="toggle" aria-label="Show password">Show</button></div>
            <div class="auth-err" id="auth-err" role="alert"></div>
            <button class="btn primary wide big-btn" type="submit">Sign in</button>
          </form>
          <div class="auth-help">
            <p><strong>First time?</strong> Sign in with the default password from L&D. You'll create your own password straight away.</p>
            <p><strong>Forgot your password or locked out?</strong> Ask the L&D admin to reset or unlock your account.</p>
          </div>
          <p class="tiny muted">Prototype: accounts and progress are stored on this device only.</p>
        </div>
      </main>`;
    document.getElementById("auth-id").focus();
  }

  let pending = null; // user who must change their password before continuing
  function renderChangePassword(user, forced, onBack) {
    pending = { user, forced, onBack };
    const R = CFG.passwordRules;
    app.innerHTML = `
      <main class="auth-wrap">
        <div class="auth-card">
          ${brand}
          <h1 class="auth-h">${forced ? "Create your password" : "Change your password"}</h1>
          <p class="muted">${forced ? `Welcome, ${esc(user.name.split(" ")[0])}. For your security, replace the default password before you continue.` : "Choose a new password for your account."}</p>
          <form id="auth-change" novalidate>
            ${forced ? "" : `<label class="lbl" for="auth-old">Current password</label><input id="auth-old" class="input" type="password" autocomplete="current-password" />`}
            <label class="lbl" for="auth-new">New password</label>
            <div class="pw-wrap"><input id="auth-new" class="input" type="password" autocomplete="new-password" /><button type="button" class="pw-toggle" data-auth="toggle" aria-label="Show password">Show</button></div>
            <label class="lbl" for="auth-confirm">Confirm new password</label>
            <input id="auth-confirm" class="input" type="password" autocomplete="new-password" />
            <ul class="pw-rules small muted"><li>At least ${R.minLength} characters</li>${R.needLetter ? "<li>At least one letter</li>" : ""}${R.needNumber ? "<li>At least one number</li>" : ""}<li>Not the default password, and not your staff ID</li></ul>
            <div class="auth-err" id="auth-err" role="alert"></div>
            <button class="btn primary wide big-btn" type="submit">Save password and continue</button>
            ${forced ? `<button type="button" class="btn wide" data-auth="cancel">Sign out</button>` : `<button type="button" class="btn wide" data-auth="back">Cancel</button>`}
          </form>
        </div>
      </main>`;
    document.getElementById(forced ? "auth-new" : "auth-old").focus();
  }

  /* ---------------- admin ---------------- */
  let admin = null; // { user, onBack, view }
  function statusOf(u) {
    if (u.status === "disabled") return ["Disabled", "st-off"];
    if (isLocked(u.staffId)) return ["Locked", "st-lock"];
    if (onDefault(u.staffId)) return ["Default password", "st-default"];
    return ["Active", "st-ok"];
  }

  function openAdmin(user, onBack) {
    if (!user || user.role !== "admin") return;
    admin = { user, onBack, view: admin?.view || "staff" };
    renderAdmin();
  }

  function renderAdmin(flash) {
    const dir = directory(), me = admin.user;
    const counts = { total: dir.length, active: 0, def: 0, locked: 0, disabled: 0 };
    dir.forEach((u) => { const [s] = statusOf(u); if (s === "Active") counts.active++; else if (s === "Default password") counts.def++; else if (s === "Locked") counts.locked++; else counts.disabled++; });
    const c = creds();
    const rows = dir.map((u) => {
      const [st, cls] = statusOf(u), self = u.staffId === me.staffId;
      return `<tr data-row="${esc(norm([u.staffId, u.name, u.email, UNITS[u.unit], u.title].join(" ")))}">
        <td><strong>${esc(u.staffId)}</strong></td>
        <td>${esc(u.name)}<div class="tiny muted">${esc(u.title || "")}</div></td>
        <td class="small">${esc(u.email)}</td>
        <td class="small">${esc(UNITS[u.unit] || u.unit)}<div class="tiny muted">${esc(SEGMENTS[u.segment] || "")}</div></td>
        <td><select class="mini-select" data-auth-role="${esc(u.staffId)}" ${self ? "disabled" : ""} aria-label="Role for ${esc(u.name)}">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
        <td><span class="st ${cls}">${st}</span></td>
        <td class="small">${when(c[u.staffId]?.lastLogin)}</td>
        <td class="acts">
          <button class="btn small" data-auth="reset" data-id="${esc(u.staffId)}" title="Reset to the default password">Reset password</button>
          ${isLocked(u.staffId) ? `<button class="btn small" data-auth="unlock" data-id="${esc(u.staffId)}">Unlock</button>` : ""}
          ${self ? "" : `<button class="btn small ${u.status === "disabled" ? "" : "danger"}" data-auth="toggle-status" data-id="${esc(u.staffId)}">${u.status === "disabled" ? "Enable" : "Disable"}</button>`}
        </td></tr>`;
    }).join("");
    const log = get(K.audit, []).slice(0, 25).map((a) => `<li><span class="tiny muted">${when(a.at)}</span> <strong>${esc(a.by)}</strong> · ${esc(a.action)} · <span class="muted">${esc(a.target)}</span></li>`).join("");

    app.innerHTML = `
      <header class="topbar admin-top">
        <div class="brand"><span class="logo">🌿</span><span>MeriQuest</span><span class="draft">Admin</span></div>
        <div><strong>Staff & access</strong><div class="muted small">Signed in as ${esc(me.name)} (${esc(me.staffId)})</div></div>
        <div class="acct"><button class="btn small" data-auth="admin-back">← Back to game</button><button class="btn small" data-auth="signout">Sign out</button></div>
      </header>
      ${flash ? `<div class="auth-note ok">${esc(flash)}</div>` : ""}
      <section class="kpis admin-kpis">
        <div><strong>${counts.total}</strong><span>staff</span></div>
        <div><strong>${counts.active}</strong><span>active</span></div>
        <div><strong>${counts.def}</strong><span>on default password</span></div>
        <div><strong>${counts.locked}</strong><span>locked</span></div>
        <div><strong>${counts.disabled}</strong><span>disabled</span></div>
      </section>
      <nav class="tabs" role="tablist">${[["staff", "👥 Staff"], ["add", "➕ Add staff"], ["import", "📥 Import / export"], ["audit", "🧾 Audit log"]].map(([k, l]) => `<button class="tab ${admin.view === k ? "on" : ""}" role="tab" aria-selected="${admin.view === k}" data-auth="view" data-v="${k}">${l}</button>`).join("")}</nav>
      <div class="admin-body">
        ${admin.view === "staff" ? `
          <input class="input admin-search" id="admin-search" placeholder="Search by staff ID, name, email or unit…" aria-label="Search staff" />
          <div class="tbl-wrap"><table class="tbl admin-tbl"><thead><tr><th>Staff ID</th><th>Name</th><th>Email</th><th>Unit / office</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
          <p class="small muted">Reset password sets the account back to the default password; the person must choose a new one at next sign-in.</p>` : ""}
        ${admin.view === "add" ? `
          <form id="admin-add" class="card admin-form" novalidate>
            <div class="form-grid">
              <label>Staff ID<input class="input" name="staffId" placeholder="${esc(CFG.staffIdExample)}" /></label>
              <label>Full name<input class="input" name="name" /></label>
              <label>Work email<input class="input" name="email" placeholder="name@${esc(CFG.allowedEmailDomains[0])}" /></label>
              <label>Job title<input class="input" name="title" /></label>
              <label>Unit<select class="input" name="unit">${Object.entries(UNITS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
              <label>Office<select class="input" name="segment">${Object.entries(SEGMENTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
              <label>Role<select class="input" name="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
              <label>Starting track<select class="input" name="track">${Object.entries(TRACKS).map(([k, v]) => `<option value="${k}" ${k === "welcome" ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            </div>
            <div class="auth-err" id="auth-err" role="alert"></div>
            <button class="btn primary" type="submit">Add staff member</button>
            <p class="small muted">New staff sign in with the default password and must set their own.</p>
          </form>` : ""}
        ${admin.view === "import" ? `
          <div class="card">
            <h3>Import staff (CSV)</h3>
            <p class="small muted">One person per line: <code>staffId,name,email,unit,office,role,title,track</code>. Units: ${Object.keys(UNITS).join(", ")}. Office: front, middle, back. Role: player, manager, admin. Existing staff IDs are updated.</p>
            <textarea id="admin-csv" class="input" rows="7" placeholder="MS4001,Grace Okon,grace.okon@${esc(CFG.allowedEmailDomains[0])},cx,front,player,Client Experience Officer,welcome"></textarea>
            <div class="auth-err" id="auth-err" role="alert"></div>
            <div class="row"><button class="btn primary" data-auth="import">Import</button><button class="btn" data-auth="export">⬇️ Export staff list (CSV)</button></div>
          </div>` : ""}
        ${admin.view === "audit" ? `<div class="card"><h3>Recent admin and security events</h3>${log ? `<ul class="audit">${log}</ul>` : `<p class="muted">No events yet.</p>`}</div>` : ""}
      </div>`;
  }

  function validateStaff(u, dir, isNew) {
    if (!new RegExp(CFG.staffIdPattern, "i").test(u.staffId)) return `Staff ID must look like ${CFG.staffIdExample}.`;
    if (!u.name) return "Enter the person's full name.";
    const domain = (u.email.split("@")[1] || "").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+$/.test(u.email) || !CFG.allowedEmailDomains.includes(domain)) return `Email must be a work address (@${CFG.allowedEmailDomains[0]}).`;
    if (!UNITS[u.unit]) return `Unknown unit "${u.unit}".`;
    if (!SEGMENTS[u.segment]) return `Office must be front, middle or back.`;
    if (!ROLES[u.role]) return `Role must be player, manager or admin.`;
    if (isNew && dir.some((x) => norm(x.staffId) === norm(u.staffId))) return `${u.staffId} already exists.`;
    if (dir.some((x) => norm(x.email) === norm(u.email) && norm(x.staffId) !== norm(u.staffId))) return `${u.email} is already used by another staff ID.`;
    return null;
  }

  /* ---------------- events ---------------- */
  const showErr = (msg) => { const el = document.getElementById("auth-err"); if (el) el.textContent = msg || ""; };

  document.addEventListener("submit", async (e) => {
    const f = e.target;
    if (f.id === "auth-signin") {
      e.preventDefault();
      showErr("");
      const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await signIn(document.getElementById("auth-id").value, document.getElementById("auth-pw").value);
      btn.disabled = false;
      if (res.error) { showErr(res.error); document.getElementById("auth-pw").value = ""; document.getElementById("auth-pw").focus(); return; }
      audit(res.user.staffId, "Signed in", res.user.staffId);
      if (res.mustChange) { renderChangePassword(res.user, true); return; }
      startSession(res.user);
      onReady(res.user);
    }
    if (f.id === "auth-change" && pending) {
      e.preventDefault();
      const { user, forced, onBack } = pending;
      const nw = document.getElementById("auth-new").value, cf = document.getElementById("auth-confirm").value;
      if (!forced) {
        const c = creds()[user.staffId];
        const old = document.getElementById("auth-old").value;
        const okOld = c && c.hash ? (await hashPw(old, c.salt)) === c.hash : old === CFG.defaultPassword;
        if (!okOld) { showErr("Your current password is incorrect."); return; }
      }
      const problem = passwordProblem(user, nw, cf);
      if (problem) { showErr(problem); return; }
      await setPassword(user, nw);
      audit(user.staffId, forced ? "Set own password (first sign-in)" : "Changed own password", user.staffId);
      pending = null;
      startSession(user);
      if (onBack) onBack(); else onReady(user);
    }
    if (f.id === "admin-add" && admin) {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(f).entries());
      const u = { staffId: fd.staffId.trim().toUpperCase(), name: fd.name.trim(), email: fd.email.trim().toLowerCase(), title: fd.title.trim(), unit: fd.unit, segment: fd.segment, role: fd.role, track: fd.track, status: "active" };
      const dir = directory(), err = validateStaff(u, dir, true);
      if (err) { showErr(err); return; }
      dir.push(u); saveDir(dir);
      audit(admin.user.staffId, "Added staff member", u.staffId);
      admin.view = "staff";
      renderAdmin(`${u.name} (${u.staffId}) added. They sign in with the default password.`);
    }
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-auth]");
    if (!el) return;
    const act = el.dataset.auth;
    if (act === "toggle") {
      const input = el.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      el.textContent = show ? "Hide" : "Show";
      el.setAttribute("aria-label", show ? "Hide password" : "Show password");
      return;
    }
    if (act === "cancel") { signOut("Signed out. Your password wasn't changed."); return; }
    if (act === "back" && pending) { const cb = pending.onBack; pending = null; cb && cb(); return; }
    if (!admin) return;
    const me = admin.user, id = el.dataset.id;
    const dir = directory(), u = id && dir.find((x) => x.staffId === id);
    switch (act) {
      case "admin-back": { const cb = admin.onBack; admin = null; cb && cb(); break; }
      case "signout": admin = null; signOut(); break;
      case "view": admin.view = el.dataset.v; renderAdmin(); break;
      case "reset": {
        if (!confirm(`Reset ${u.name}'s password to the default? They'll have to choose a new one at next sign-in.`)) return;
        const all = creds(); all[id] = { lastLogin: all[id]?.lastLogin, mustChange: true }; saveCreds(all);
        audit(me.staffId, "Reset password to default", id);
        if (id === me.staffId) { admin = null; signOut("Your password was reset. Sign in with the default password."); return; }
        renderAdmin(`Password reset for ${u.name}. They now sign in with the default password.`);
        break;
      }
      case "unlock": {
        const all = creds(); if (all[id]) { delete all[id].lockedUntil; all[id].failed = 0; } saveCreds(all);
        audit(me.staffId, "Unlocked account", id);
        renderAdmin(`${u.name}'s account is unlocked.`);
        break;
      }
      case "toggle-status": {
        const disable = u.status !== "disabled";
        if (disable && !confirm(`Disable ${u.name}? They won't be able to sign in until re-enabled.`)) return;
        u.status = disable ? "disabled" : "active"; saveDir(dir);
        audit(me.staffId, disable ? "Disabled account" : "Enabled account", id);
        renderAdmin(`${u.name} is now ${disable ? "disabled" : "active"}.`);
        break;
      }
      case "export": {
        const head = "staffId,name,email,unit,office,role,title,track,status";
        const q = (v) => /[",\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? "");
        const csv = [head, ...dir.map((x) => [x.staffId, x.name, x.email, x.unit, x.segment, x.role, x.title, x.track, x.status].map(q).join(","))].join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "meriquest-staff.csv"; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        audit(me.staffId, "Exported staff list", `${dir.length} staff`);
        break;
      }
      case "import": {
        const lines = document.getElementById("admin-csv").value.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^staffid,/i.test(l));
        if (!lines.length) { showErr("Paste at least one line."); return; }
        let added = 0, updated = 0;
        for (const [i, line] of lines.entries()) {
          const [staffId, name, email, unit, segment, role, title, track] = line.split(",").map((s) => s.trim());
          const rec = { staffId: (staffId || "").toUpperCase(), name, email: (email || "").toLowerCase(), unit: unit || "other", segment: segment || "front", role: role || "player", title: title || "", track: TRACKS[track] ? track : "welcome" };
          const existing = dir.find((x) => norm(x.staffId) === norm(rec.staffId));
          const err = validateStaff(rec, dir, !existing);
          if (err) { showErr(`Line ${i + 1}: ${err} Nothing after this line was imported.`); saveDir(dir); if (added || updated) audit(me.staffId, "Imported staff (partial)", `${added} added, ${updated} updated`); return; }
          if (existing) { if (existing.staffId === me.staffId) rec.role = existing.role; Object.assign(existing, rec); updated++; } else { dir.push({ ...rec, status: "active" }); added++; }
        }
        saveDir(dir);
        audit(me.staffId, "Imported staff", `${added} added, ${updated} updated`);
        admin.view = "staff";
        renderAdmin(`Import complete: ${added} added, ${updated} updated.`);
        break;
      }
    }
  });

  document.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-auth-role]");
    if (!sel || !admin) return;
    const dir = directory(), u = dir.find((x) => x.staffId === sel.dataset.authRole);
    u.role = sel.value; saveDir(dir);
    audit(admin.user.staffId, `Changed role to ${ROLES[u.role]}`, u.staffId);
    renderAdmin(`${u.name} is now ${ROLES[u.role]}.`);
  });

  document.addEventListener("input", (e) => {
    if (e.target.id !== "admin-search") return;
    const q = norm(e.target.value);
    document.querySelectorAll(".admin-tbl tbody tr").forEach((tr) => { tr.hidden = q && !tr.dataset.row.includes(q); });
  });

  window.MQAuth = {
    boot, signOut, current, UNITS, SEGMENTS,
    openAdmin: (user, onBack) => openAdmin(byId(user.staffId), onBack),
    openChangePassword: (user, onBack) => renderChangePassword(byId(user.staffId), false, onBack),
  };
})();
