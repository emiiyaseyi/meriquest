/*
 * MeriQuest — game engine v0.1 (prototype)
 * Vanilla JS, no build step. Reads window.MERIQUEST_CONTENT, saves to localStorage.
 * Every learning event is also recorded as an xAPI-style statement in S.log
 * so the production build can forward it to an LRS / LMS.
 */
(function () {
  "use strict";

  const C = window.MERIQUEST_CONTENT;
  const KEY = "meriquest.save.v1";
  const SLOTS = ["Morning", "Midday", "Afternoon", "Evening"];
  const COST = { scenario: 20, quiz: 10 };
  const XP = { best: 30, ok: 15, poor: 5, quizRight: 10, missions: 50 };
  const AVATARS = ["👩🏾‍💼", "👨🏾‍💼", "🧑🏾‍💼", "🧕🏾", "👩🏽‍💼", "👨🏿‍💼"];

  const app = document.getElementById("app");
  const modalEl = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const toastEl = document.getElementById("toast");

  let S = load();
  let tab = "world";
  let quizRun = null;
  let setup = { name: "", avatar: AVATARS[0], trackId: C.tracks[0].id };

  /* ---------------- utilities ---------------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const track = () => C.tracks.find((t) => t.id === S.player.trackId);
  const locById = (id) => C.locations.find((l) => l.id === id);
  const compById = (id) => C.competencies.find((c) => c.id === id);
  const valueById = (id) => C.values.find((v) => v.id === id);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // Display order for answer options, so the best answer isn't always "A".
  function shuffledIdx(n) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function load() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: play continues in memory */ }
  }

  function levelInfo(xp) {
    let idx = 0;
    C.levels.forEach((l, i) => { if (xp >= l.xp) idx = i; });
    const cur = C.levels[idx], next = C.levels[idx + 1] || null;
    const pct = next ? Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
    return { idx, cur, next, pct };
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  function record(verb, object, result) {
    S.log.push({
      actor: { name: S.player.name },
      verb: { id: "http://adlnet.gov/expapi/verbs/" + verb, display: verb },
      object: { id: "https://meriquest.local/" + object.id, name: object.name },
      result: result || null,
      context: { track: S.player.trackId, day: S.day },
      timestamp: new Date().toISOString(),
    });
  }

  /* ---------------- state transitions ---------------- */
  function newGame(name, avatar, trackId) {
    const t = C.tracks.find((x) => x.id === trackId);
    const comps = {};
    C.competencies.forEach((c) => (comps[c.id] = t.baseline[c.id] ?? 20));
    S = {
      v: 1, player: { name, avatar, trackId }, startedAt: new Date().toISOString(),
      day: 1, slot: 0, energy: 100, trust: 50, compliance: 80, xp: 0,
      baseline: { ...comps }, comps, done: {}, quizSeen: {}, missions: null, streak: 0,
      journal: [], badges: {}, log: [], stats: { best: 0, ok: 0, poor: 0, qRight: 0, qTotal: 0 }, finished: false,
    };
    newDayMissions();
    record("launched", { id: "track/" + trackId, name: t.title });
    save();
  }

  function newDayMissions() {
    S.missions = {
      claimed: false,
      list: [
        { id: "scn", label: "Handle 2 workplace scenarios", target: 2, progress: 0 },
        { id: "quiz", label: "Score 2 of 3 on the Learning Hub quiz", target: 1, progress: 0 },
        { id: "rest", label: "Take one recharge break", target: 1, progress: 0 },
      ],
    };
  }

  function bump(id) {
    const m = S.missions.list.find((x) => x.id === id);
    if (m) m.progress = Math.min(m.target, m.progress + 1);
    if (!S.missions.claimed && S.missions.list.every((x) => x.progress >= x.target)) {
      S.missions.claimed = true;
      gainXP(XP.missions);
      toast("🎯 All daily missions done! +" + XP.missions + " XP");
    }
  }

  function gainXP(n) {
    const before = levelInfo(S.xp).idx;
    S.xp = Math.max(0, S.xp + n);
    const after = levelInfo(S.xp);
    if (after.idx > before) {
      setTimeout(() => toast("🌿 You grew to " + after.cur.name + "!"), 400);
      record("progressed", { id: "level/" + after.cur.name, name: "Reached " + after.cur.name });
    }
  }

  const pending = () => track().scenarios.filter((s) => !(s.id in S.done));
  const available = () => pending().slice(0, 2);
  const slotsLeft = () => SLOTS.length - S.slot;

  function canAct(cost) {
    if (slotsLeft() <= 0) { toast("🌙 The workday is over. End the day to continue."); return false; }
    if (S.energy < cost) { toast("😮‍💨 Too drained. Recharge at Meri Café or the Wellness Room first."); return false; }
    return true;
  }
  function useSlot(cost) { S.slot += 1; S.energy = clamp(S.energy - cost); }

  /* ---------------- modal ---------------- */
  function openModal(html) {
    modalBody.innerHTML = html;
    modalEl.hidden = false;
    document.body.classList.add("modal-open");
    const first = modalBody.querySelector("button, input");
    if (first) first.focus();
  }
  function closeModal() {
    modalEl.hidden = true;
    document.body.classList.remove("modal-open");
    modalBody.innerHTML = "";
  }

  /* ---------------- scenarios ---------------- */
  function openScenario(id) {
    const s = track().scenarios.find((x) => x.id === id);
    if (!s || !canAct(COST.scenario)) return;
    const loc = locById(s.location);
    openModal(`
      <div class="m-eyebrow">${loc.emoji} ${esc(loc.name)} · <span class="tag tag-${s.type.replace(/\s/g, "").toLowerCase()}">${esc(s.type)}</span></div>
      <h2 class="m-title">${esc(s.title)}</h2>
      <div class="npc"><span class="npc-face">${s.who.emoji}</span><div><strong>${esc(s.who.name)}</strong><div class="muted">${esc(s.who.role)}</div></div></div>
      <p class="m-text">${esc(s.text)}</p>
      <div class="choices">
        ${shuffledIdx(s.choices.length).map((i, pos) => `<button class="choice" data-act="choose" data-sid="${s.id}" data-i="${i}"><span class="choice-key">${"ABC"[pos]}</span><span>${esc(s.choices[i].label)}</span></button>`).join("")}
      </div>
      <div class="m-foot muted">Uses one time slot and ${COST.scenario} energy.</div>`);
  }

  function fxChips(fx) {
    const out = [];
    Object.entries(fx.comps || {}).forEach(([k, v]) => out.push(chip(compById(k).name, v)));
    if (fx.trust) out.push(chip("Client trust", fx.trust));
    if (fx.compliance) out.push(chip("Compliance standing", fx.compliance));
    if (fx.energy) out.push(chip("Energy", fx.energy));
    return out.join("");
  }
  const chip = (label, v) => `<span class="delta ${v >= 0 ? "up" : "down"}">${v >= 0 ? "+" : ""}${v} ${esc(label)}</span>`;

  function choose(sid, i) {
    const s = track().scenarios.find((x) => x.id === sid);
    const ch = s.choices[i];
    const fx = ch.fx || {};
    useSlot(COST.scenario);
    Object.entries(fx.comps || {}).forEach(([k, v]) => (S.comps[k] = clamp(S.comps[k] + v)));
    S.trust = clamp(S.trust + (fx.trust || 0));
    S.compliance = clamp(S.compliance + (fx.compliance || 0));
    S.energy = clamp(S.energy + (fx.energy || 0));
    S.done[sid] = i;
    S.stats[ch.rating] += 1;
    const xp = XP[ch.rating];
    gainXP(xp);
    let badge = "";
    if (ch.rating === "best" && ch.value) {
      S.badges[ch.value] = (S.badges[ch.value] || 0) + 1;
      const v = valueById(ch.value);
      badge = `<div class="badge-earned">${v.emoji} You showed <strong>${esc(v.name)}</strong></div>`;
    }
    S.journal.unshift({ day: S.day, title: s.title, rating: ch.rating, choice: ch.label, coach: s.coach });
    bump("scn");
    record("answered", { id: "scenario/" + sid, name: s.title }, { response: ch.label, rating: ch.rating, success: ch.rating === "best" });
    save();

    const ratingLabel = { best: "Best call", ok: "Partly right", poor: "Risky call" }[ch.rating];
    const best = s.choices.find((c) => c.rating === "best");
    openModal(`
      <div class="rating rating-${ch.rating}">${ratingLabel} · +${xp} XP</div>
      <h2 class="m-title">${esc(s.title)}</h2>
      <p class="m-text">${esc(ch.outcome)}</p>
      <div class="deltas">${fxChips(fx)}</div>
      ${badge}
      <div class="coach"><div class="coach-h">🧑🏾‍🏫 Coach's note</div><p>${esc(s.coach)}</p>
      ${ch.rating !== "best" ? `<p class="muted"><strong>Stronger option:</strong> ${esc(best.label)}</p>` : ""}</div>
      <button class="btn primary wide" data-act="after-scenario">Continue</button>`);
  }

  function afterScenario() {
    closeModal();
    if (!S.finished && pending().length === 0) { S.finished = true; save(); showReadiness(); return; }
    render();
  }

  /* ---------------- rest ---------------- */
  function rest(locId) {
    if (slotsLeft() <= 0) { toast("🌙 The workday is over. End the day to continue."); return; }
    const loc = locById(locId);
    useSlot(0);
    S.energy = clamp(S.energy + 35);
    if (locId === "cafe") S.comps.team = clamp(S.comps.team + 1);
    bump("rest");
    record("experienced", { id: "rest/" + locId, name: loc.name });
    save();
    openModal(`
      <div class="m-eyebrow">${loc.emoji} ${esc(loc.name)}</div>
      <h2 class="m-title">Recharged</h2>
      <p class="m-text">${esc(pick(loc.restText))}</p>
      <div class="deltas">${chip("Energy", 35)}${locId === "cafe" ? chip("Collaboration", 1) : ""}</div>
      <p class="muted small">Wellbeing is part of performance. Good advisors don't run on empty.</p>
      <button class="btn primary wide" data-act="close">Back to work</button>`);
  }

  /* ---------------- quiz ---------------- */
  function openQuiz() {
    if (!canAct(COST.quiz)) return;
    const bank = [...track().quiz, ...C.groupQuiz];
    const fresh = bank.filter((q) => !S.quizSeen[q.id]);
    const pool = (fresh.length >= 3 ? fresh : bank).slice().sort(() => Math.random() - 0.5);
    useSlot(COST.quiz);
    save();
    quizRun = { qs: pool.slice(0, 3), idx: 0, right: 0, answered: false };
    renderQuizQ();
  }

  function renderQuizQ() {
    const q = quizRun.qs[quizRun.idx];
    openModal(`
      <div class="m-eyebrow">🎓 Learning Hub · Question ${quizRun.idx + 1} of ${quizRun.qs.length}</div>
      <h2 class="m-title">${esc(q.q)}</h2>
      <div class="choices">${shuffledIdx(q.options.length).map((i, pos) => `<button class="choice" data-act="qanswer" data-i="${i}"><span class="choice-key">${"ABCD"[pos]}</span><span>${esc(q.options[i])}</span></button>`).join("")}</div>
      <div id="qfeedback"></div>`);
  }

  function quizAnswer(i) {
    if (quizRun.answered) return;
    quizRun.answered = true;
    const q = quizRun.qs[quizRun.idx];
    const right = i === q.answer;
    if (right) quizRun.right += 1;
    S.quizSeen[q.id] = true;
    S.comps[q.comp] = clamp(S.comps[q.comp] + (right ? 3 : 1));
    S.stats.qTotal += 1; if (right) S.stats.qRight += 1;
    record("answered", { id: "quiz/" + q.id, name: q.q }, { success: right });
    modalBody.querySelectorAll(".choice").forEach((b) => {
      const idx = +b.dataset.i;
      b.disabled = true;
      if (idx === q.answer) b.classList.add("correct");
      else if (idx === i) b.classList.add("wrong");
    });
    const last = quizRun.idx === quizRun.qs.length - 1;
    modalBody.querySelector("#qfeedback").innerHTML = `
      <div class="coach"><div class="coach-h">${right ? "✅ Correct" : "📘 Not quite"}</div><p>${esc(q.explain)}</p></div>
      <button class="btn primary wide" data-act="${last ? "qfinish" : "qnext"}">${last ? "See results" : "Next question"}</button>`;
    modalBody.querySelector("#qfeedback button").focus();
    save();
  }

  function quizFinish() {
    const { right, qs } = quizRun;
    const xp = right * XP.quizRight;
    gainXP(xp);
    if (right >= 2) bump("quiz");
    save();
    openModal(`
      <div class="m-eyebrow">🎓 Learning Hub</div>
      <h2 class="m-title">You scored ${right} / ${qs.length}</h2>
      <div class="deltas">${chip("XP", xp)}</div>
      <p class="m-text">${right >= 2 ? "Daily knowledge mission complete." : "Score 2 or more to complete today's knowledge mission. Try again next time slot."}</p>
      <button class="btn primary wide" data-act="close">Done</button>`);
    quizRun = null;
  }

  /* ---------------- day cycle ---------------- */
  function endDay() {
    const done = S.missions.claimed;
    S.streak = done ? S.streak + 1 : 0;
    const summary = S.missions.list.map((m) => `<li class="${m.progress >= m.target ? "ok" : ""}">${m.progress >= m.target ? "✅" : "⬜"} ${esc(m.label)}</li>`).join("");
    record("completed", { id: "day/" + S.day, name: "Day " + S.day }, { success: done });
    const finishedDay = S.day;
    S.day += 1; S.slot = 0; S.energy = 100;
    newDayMissions();
    save();
    openModal(`
      <div class="m-eyebrow">🌙 End of day ${finishedDay}</div>
      <h2 class="m-title">${done ? "Strong day." : "Day closed."}</h2>
      <ul class="mission-sum">${summary}</ul>
      <p class="m-text">${done ? `🔥 Streak: ${S.streak} day${S.streak === 1 ? "" : "s"}.` : "Missions incomplete, so your streak resets. Tomorrow is a new day."}</p>
      <button class="btn primary wide" data-act="close">Start day ${S.day}</button>`);
  }

  /* ---------------- readiness review ---------------- */
  function readiness() {
    const t = track();
    const avg = t.focus.reduce((a, k) => a + S.comps[k], 0) / t.focus.length;
    const growth = t.focus.reduce((a, k) => a + (S.comps[k] - S.baseline[k]), 0) / t.focus.length;
    const bestRate = S.stats.best / Math.max(1, t.scenarios.length);
    // Weighted: judgement quality matters most, then growth, then standing.
    const score = Math.round(clamp(bestRate * 55 + clamp(growth * 2.5, 0, 25) + S.trust * 0.1 + S.compliance * 0.1));
    return { score, avg: Math.round(avg), growth: Math.round(growth) };
  }

  function showReadiness() {
    const t = track();
    const r = readiness();
    const verdict = r.score >= 75 ? ["Ready now", "ok"] : r.score >= 55 ? ["Ready with development", "mid"] : ["Not yet: replay recommended", "low"];
    record("completed", { id: "track/" + t.id, name: t.title }, { score: { scaled: r.score / 100 }, success: r.score >= 75 });
    save();
    openModal(`
      <div class="cert">
        <div class="cert-top">MeriQuest · Readiness Review</div>
        <div class="cert-emoji">${t.emoji}</div>
        <h2 class="m-title">${esc(S.player.name)}</h2>
        <p class="muted">${esc(t.role)} → <strong>${esc(t.target)}</strong></p>
        <div class="cert-score"><span>${r.score}</span>/100</div>
        <div class="verdict verdict-${verdict[1]}">${verdict[0]}</div>
        <div class="cert-grid">
          <div><strong>${S.stats.best}/${t.scenarios.length}</strong><span>best calls</span></div>
          <div><strong>+${r.growth}</strong><span>avg skill growth</span></div>
          <div><strong>${S.compliance}</strong><span>compliance</span></div>
          <div><strong>${S.trust}</strong><span>client trust</span></div>
        </div>
      </div>
      <p class="muted small">In production this review goes to your line manager and HRBP, and feeds your Individual Development Plan.</p>
      <div class="row"><button class="btn" data-act="close">Keep exploring</button><button class="btn primary" data-act="restart">Try another track</button></div>`);
  }

  /* ---------------- rendering ---------------- */
  function render() {
    if (!S) return renderSetup();
    const t = track();
    const lv = levelInfo(S.xp);
    app.innerHTML = `
      <header class="topbar">
        <div class="brand"><span class="logo">🌿</span><span>MeriQuest</span><span class="draft">Prototype</span></div>
        <div class="who">
          <span class="avatar">${S.player.avatar}</span>
          <div><strong>${esc(S.player.name)}</strong><div class="muted small">${esc(t.role)}</div></div>
        </div>
        <div class="lvl">
          <div class="lvl-row"><span class="lvl-name">${lv.cur.name}</span><span class="muted small">${S.xp} XP${lv.next ? " · next: " + lv.next.name : ""}</span></div>
          <div class="bar"><i style="width:${lv.pct}%"></i></div>
        </div>
        <div class="clock"><strong>Day ${S.day}</strong><div class="muted small">${slotsLeft() > 0 ? SLOTS[S.slot] : "After hours"} · 🔥 ${S.streak}</div></div>
      </header>

      <section class="meters">
        ${meter("⚡ Energy", S.energy, "energy")}
        ${meter("🤝 Client trust", S.trust, "trust")}
        ${meter("🛡️ Compliance", S.compliance, "compliance")}
        <div class="slots" aria-label="Time slots">${SLOTS.map((s, i) => `<span class="slot ${i < S.slot ? "used" : i === S.slot ? "now" : ""}" title="${s}">${s[0]}</span>`).join("")}</div>
        <button class="btn small ${slotsLeft() === 0 ? "primary pulse" : ""}" data-act="endday">End day</button>
      </section>

      <nav class="tabs" role="tablist">
        ${[["world", "🗺️ World"], ["skills", "📊 Skills"], ["journal", "📓 Journal"], ["values", "🏅 Values"], ["report", "📋 L&D report"]]
          .map(([id, l]) => `<button role="tab" aria-selected="${tab === id}" class="tab ${tab === id ? "on" : ""}" data-act="tab" data-tab="${id}">${l}</button>`).join("")}
      </nav>

      <main class="layout">
        <div class="main-col">${{ world: viewWorld, skills: viewSkills, journal: viewJournal, values: viewValues, report: viewReport }[tab]()}</div>
        <aside class="side">${viewSide()}</aside>
      </main>
      <footer class="foot muted small">${esc(C.meta.disclaimer)} · v${C.meta.version}</footer>`;
  }

  const meter = (label, v, cls) => `<div class="meter m-${cls}"><div class="meter-l"><span>${label}</span><strong>${v}</strong></div><div class="bar"><i style="width:${v}%"></i></div></div>`;

  function viewWorld() {
    const av = available();
    const byLoc = {};
    av.forEach((s) => { if (!byLoc[s.location]) byLoc[s.location] = s; }); // earliest scenario wins a shared location
    return `
      <div class="section-h"><h2>Meristem World</h2><span class="muted small">${pending().length} of ${track().scenarios.length} scenarios left in this track</span></div>
      <div class="map">
        ${C.locations.map((l) => {
          const s = byLoc[l.id];
          let act = "", badge = "", cls = "quiet";
          if (s) { act = `data-act="scenario" data-sid="${s.id}"`; badge = `<span class="pin">!</span>`; cls = "live"; }
          else if (l.rest) { act = `data-act="rest" data-loc="${l.id}"`; badge = `<span class="pin rest">+⚡</span>`; cls = "rest"; }
          else if (l.quiz) { act = `data-act="quiz"`; badge = `<span class="pin quiz">?</span>`; cls = "quizloc"; }
          const tag = act ? "button" : "div";
          return `<${tag} class="loc ${cls}" ${act}>${badge}<span class="loc-emoji">${l.emoji}</span><span class="loc-name">${esc(l.name)}</span><span class="loc-sub">${s ? esc(s.title) : esc(l.sub)}</span></${tag}>`;
        }).join("")}
      </div>
      <p class="muted small legend"><span class="pin inline">!</span> scenario waiting · <span class="pin rest inline">+⚡</span> recharge · <span class="pin quiz inline">?</span> knowledge check · grey = quiet right now</p>`;
  }

  function viewSide() {
    const t = track();
    const m = S.missions.list.map((x) => `<li class="${x.progress >= x.target ? "ok" : ""}"><span>${x.progress >= x.target ? "✅" : "⬜"}</span><span>${esc(x.label)}<em>${x.progress}/${x.target}</em></span></li>`).join("");
    const next = available().map((s) => `<li><button class="link" data-act="scenario" data-sid="${s.id}">${locById(s.location).emoji} ${esc(s.title)}</button><span class="tag tag-${s.type.replace(/\s/g, "").toLowerCase()}">${esc(s.type)}</span></li>`).join("");
    return `
      <div class="card"><h3>🎯 Today's missions</h3><ul class="missions">${m}</ul><p class="muted small">Finish all three for +${XP.missions} XP and keep your streak.</p></div>
      <div class="card"><h3>📌 Up next</h3>${next ? `<ul class="next">${next}</ul>` : `<p class="muted">Track complete! <button class="link" data-act="review">View readiness review</button></p>`}</div>
      <div class="card track-card"><h3>${t.emoji} ${esc(t.title)}</h3><p class="muted small">${esc(t.subsidiary)}</p>
        <p class="small"><strong>Goal:</strong> ${esc(t.role)} → ${esc(t.target)}</p>
        <button class="link small" data-act="restart">Switch track</button></div>`;
  }

  function viewSkills() {
    const t = track();
    const row = (c) => {
      const v = S.comps[c.id], b = S.baseline[c.id], d = v - b;
      return `<div class="skill ${t.focus.includes(c.id) ? "focus" : ""}"><div class="skill-l"><span>${esc(c.name)}</span><span>${v}${d ? ` <em class="${d > 0 ? "up" : "down"}">${d > 0 ? "+" : ""}${d}</em>` : ""}</span></div><div class="bar"><i class="base" style="width:${b}%"></i><i style="width:${v}%"></i></div></div>`;
    };
    const tech = C.competencies.filter((c) => c.group === "technical"), soft = C.competencies.filter((c) => c.group === "soft");
    return `
      <div class="section-h"><h2>Skills profile</h2><span class="muted small">Dashed = starting point · bold = focus skills for this track</span></div>
      <div class="skills-wrap">
        <div class="radar-box">${radar()}</div>
        <div class="skill-cols">
          <div><h3>🛠️ Technical</h3>${tech.map(row).join("")}</div>
          <div><h3>💬 Soft skills</h3>${soft.map(row).join("")}</div>
        </div>
      </div>
      <div class="card"><h3>What this role needs</h3>
        <div class="two"><div><h4>Technical</h4><ul>${t.skills.technical.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div><h4>Soft skills</h4><ul>${t.skills.soft.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div></div></div>`;
  }

  function radar() {
    const cs = C.competencies, n = cs.length, cx = 180, cy = 165, R = 115;
    const pt = (i, v) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]; };
    const poly = (vals) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
    const rings = [25, 50, 75, 100].map((r) => `<polygon class="ring" points="${poly(cs.map(() => r))}"/>`).join("");
    const spokes = cs.map((_, i) => { const [x, y] = pt(i, 100); return `<line class="spoke" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`; }).join("");
    const labels = cs.map((c, i) => { const [x, y] = pt(i, 122); return `<text x="${x}" y="${y}" text-anchor="${Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end"}" dominant-baseline="middle" class="${c.group}">${esc(c.short)}</text>`; }).join("");
    return `<svg viewBox="-30 0 420 330" role="img" aria-label="Skills radar">${rings}${spokes}
      <polygon class="base" points="${poly(cs.map((c) => S.baseline[c.id]))}"/>
      <polygon class="cur" points="${poly(cs.map((c) => S.comps[c.id]))}"/>${labels}</svg>
      <div class="legend-row small"><span class="lg tech">Technical</span><span class="lg soft">Soft</span></div>`;
  }

  function viewJournal() {
    if (!S.journal.length) return `<div class="section-h"><h2>Journal</h2></div><div class="empty">Your decisions and coach's notes will appear here.</div>`;
    return `<div class="section-h"><h2>Journal</h2><span class="muted small">Every decision, with feedback</span></div>
      ${S.journal.map((j) => `<div class="card jentry"><div class="j-top"><strong>${esc(j.title)}</strong><span class="rating small rating-${j.rating}">${{ best: "Best call", ok: "Partly right", poor: "Risky" }[j.rating]}</span><span class="muted small">Day ${j.day}</span></div>
        <p class="small"><em>You chose:</em> ${esc(j.choice)}</p><p class="small muted">🧑🏾‍🏫 ${esc(j.coach)}</p></div>`).join("")}`;
  }

  function viewValues() {
    return `<div class="section-h"><h2>CEPOEM values</h2><span class="muted small">Earned by making the best call in a scenario</span></div>
      <div class="values">${C.values.map((v) => { const n = S.badges[v.id] || 0; return `<div class="value ${n ? "earned" : ""}"><span class="v-emoji">${v.emoji}</span><strong>${esc(v.name)}</strong><span class="small muted">${esc(v.desc)}</span><span class="v-count">${n ? "×" + n : "Not yet"}</span></div>`; }).join("")}</div>`;
  }

  function viewReport() {
    const t = track();
    const r = readiness();
    const acc = S.stats.qTotal ? Math.round((S.stats.qRight / S.stats.qTotal) * 100) : 0;
    return `<div class="section-h"><h2>L&D / manager report</h2><span class="muted small">What a line manager or HRBP would see</span></div>
      <div class="kpis">
        <div><strong>${Object.keys(S.done).length}/${t.scenarios.length}</strong><span>scenarios done</span></div>
        <div><strong>${S.stats.best}·${S.stats.ok}·${S.stats.poor}</strong><span>best · partly · risky</span></div>
        <div><strong>${acc}%</strong><span>quiz accuracy (${S.stats.qTotal} Qs)</span></div>
        <div><strong>${r.score}</strong><span>readiness score</span></div>
      </div>
      <table class="tbl"><thead><tr><th>Competency</th><th>Type</th><th>Start</th><th>Now</th><th>Δ</th></tr></thead><tbody>
        ${C.competencies.map((c) => { const d = S.comps[c.id] - S.baseline[c.id]; return `<tr class="${t.focus.includes(c.id) ? "focus" : ""}"><td>${esc(c.name)}</td><td>${c.group}</td><td>${S.baseline[c.id]}</td><td>${S.comps[c.id]}</td><td class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" : ""}${d}</td></tr>`; }).join("")}
      </tbody></table>
      <div class="row"><button class="btn" data-act="export">⬇️ Export learning records (xAPI JSON)</button><button class="btn danger" data-act="reset">Reset progress</button></div>
      <p class="muted small">${S.log.length} learning events recorded on this device. In production these flow to the Learning Record Store and the HR dashboard.</p>`;
  }

  function renderSetup() {
    app.innerHTML = `
      <div class="setup">
        <div class="hero">
          <div class="brand big"><span class="logo">🌿</span><span>MeriQuest</span><span class="draft">Prototype</span></div>
          <h1>Grow your Meristem career, one decision at a time.</h1>
          <p class="muted">A life-sim for learning: walk the Group, meet clients and colleagues, make real calls, and build technical and soft skills together.</p>
        </div>
        <div class="card">
          <label class="lbl" for="pname">Your name</label>
          <input id="pname" class="input" maxlength="30" placeholder="e.g. Tolu" value="${esc(setup.name)}" />
          <div class="lbl">Avatar</div>
          <div class="avatars">${AVATARS.map((a) => `<button class="av ${setup.avatar === a ? "on" : ""}" data-act="avatar" data-a="${a}" aria-label="Avatar ${a}">${a}</button>`).join("")}</div>
        </div>
        <h2 class="pick-h">Choose your starting track</h2>
        <div class="tracks">
          ${C.tracks.map((t) => `<button class="trk ${setup.trackId === t.id ? "on" : ""}" data-act="pick" data-t="${t.id}">
            <span class="trk-emoji">${t.emoji}</span><strong>${esc(t.title)}</strong>
            <span class="small">${esc(t.role)} → ${esc(t.target)}</span>
            <span class="muted small">${esc(t.audience)}</span>
            <span class="small">${esc(t.blurb)}</span></button>`).join("")}
        </div>
        <button class="btn primary wide big-btn" data-act="start">Start my journey →</button>
        <h3 class="pick-h">Coming next</h3>
        <div class="locked">${C.lockedTracks.map((l) => `<div class="lk"><span>${l.emoji}</span><div><strong>${esc(l.title)}</strong><div class="muted small">${esc(l.sub)}</div></div><span class="lock">🔒</span></div>`).join("")}</div>
        <p class="muted small foot">${esc(C.meta.disclaimer)}</p>
      </div>`;
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) { if (e.target === modalEl) closeModalSafe(); return; }
    const a = el.dataset.act;
    switch (a) {
      case "avatar": setup.avatar = el.dataset.a; setup.name = (document.getElementById("pname") || {}).value || setup.name; renderSetup(); break;
      case "pick": setup.trackId = el.dataset.t; setup.name = (document.getElementById("pname") || {}).value || setup.name; renderSetup(); break;
      case "start": {
        const name = (document.getElementById("pname").value || "").trim();
        if (!name) { toast("Please enter your name to begin."); document.getElementById("pname").focus(); return; }
        newGame(name, setup.avatar, setup.trackId); tab = "world"; render();
        const t = track();
        openModal(`<div class="m-eyebrow">${t.emoji} ${esc(t.subsidiary)}</div><h2 class="m-title">Welcome, ${esc(name)}</h2>
          <p class="m-text">You start as <strong>${esc(t.role)}</strong>. Your goal is to reach <strong>${esc(t.target)}</strong>.</p>
          <ul class="howto"><li>🗺️ Locations marked <strong>!</strong> have a scenario waiting. Each one uses a time slot and energy.</li>
          <li>🎓 Do the daily knowledge check at the Learning Hub.</li><li>☕ Recharge when energy runs low: wellbeing matters.</li>
          <li>🌙 Four time slots a day. End the day to reset, and finish your missions to build a streak.</li></ul>
          <button class="btn primary wide" data-act="close">Let's go</button>`);
        break;
      }
      case "tab": tab = el.dataset.tab; render(); break;
      case "scenario": openScenario(el.dataset.sid); break;
      case "choose": choose(el.dataset.sid, +el.dataset.i); break;
      case "after-scenario": afterScenario(); break;
      case "rest": rest(el.dataset.loc); render(); break;
      case "quiz": openQuiz(); render(); break;
      case "qanswer": quizAnswer(+el.dataset.i); break;
      case "qnext": quizRun.idx += 1; quizRun.answered = false; renderQuizQ(); break;
      case "qfinish": quizFinish(); render(); break;
      case "endday": endDay(); render(); break;
      case "review": showReadiness(); break;
      case "close": closeModal(); render(); break;
      case "export": exportLog(); break;
      case "restart":
        if (confirm("Start a new track? Your current progress on this device will be cleared.")) { closeModal(); resetAll(); }
        break;
      case "reset": if (confirm("Reset all progress on this device?")) resetAll(); break;
    }
  });

  // Escape/backdrop: an unanswered scenario can be backed out of at no cost; a running quiz must be finished.
  function closeModalSafe() {
    if (modalBody.querySelector('[data-act="qanswer"]')) return;
    if (modalBody.querySelector('[data-act="after-scenario"]')) { afterScenario(); return; }
    closeModal(); render();
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalEl.hidden) closeModalSafe(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "pname") document.querySelector('[data-act="start"]').click(); });

  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = null; setup = { name: "", avatar: AVATARS[0], trackId: C.tracks[0].id }; tab = "world"; render();
  }

  function exportLog() {
    const blob = new Blob([JSON.stringify({ player: S.player, comps: S.comps, baseline: S.baseline, stats: S.stats, statements: S.log }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meriquest-${S.player.name.replace(/\W+/g, "_")}-records.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  render();
})();
