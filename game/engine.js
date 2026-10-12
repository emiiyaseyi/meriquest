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

  let S = migrate(load());
  let tab = "world";
  let quizRun = null;
  let sim = null;
  let setup = { name: "", avatar: AVATARS[0], trackId: C.tracks[0].id, segment: C.tracks[0].segment };

  // Saves from older prototype versions: add new competencies, segment and client-sim stats.
  function migrate(s) {
    if (!s) return s;
    const t = C.tracks.find((x) => x.id === s.player.trackId) || C.tracks[0];
    C.competencies.forEach((c) => {
      if (s.comps[c.id] == null) { s.comps[c.id] = t.baseline[c.id] ?? 20; s.baseline[c.id] = s.comps[c.id]; }
    });
    s.player.segment = s.player.segment || t.segment;
    s.cx = s.cx || newCx();
    return s;
  }
  function newCx() { return { plays: 0, closed: 0, partial: 0, lost: 0, value: 0, growth: 0, csatSum: 0, reads: 0, readsRight: 0, best: {} }; }

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
  function newGame(name, avatar, trackId, segment) {
    const t = C.tracks.find((x) => x.id === trackId);
    const comps = {};
    C.competencies.forEach((c) => (comps[c.id] = t.baseline[c.id] ?? 20));
    S = {
      v: 1, player: { name, avatar, trackId, segment }, startedAt: new Date().toISOString(), cx: newCx(),
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

  /* ---------------- office segment & performance index ---------------- */
  const segmentOf = () => C.segments.find((s) => s.id === S.player.segment) || C.segments[0];
  const naira = (n) => (n >= 1e9 ? "₦" + +(n / 1e9).toFixed(2) + "bn" : n >= 1e6 ? "₦" + +(n / 1e6).toFixed(1) + "m" : "₦" + Math.round(n).toLocaleString("en-NG"));

  // Weighted by the player's office segment; leadership tracks blend in Leadership; a low
  // compliance standing caps the score (conduct is a gate, not a trade-off).
  function perfIndex() {
    const seg = segmentOf();
    let v = 0;
    Object.entries(seg.weights).forEach(([k, w]) => (v += w * (S.comps[k] || 0)));
    v /= 100;
    if (track().leader) v = v * (1 - C.leaderOverlay) + S.comps.lead * C.leaderOverlay;
    const gated = S.compliance < 50;
    if (gated) v *= 0.8;
    return { score: Math.round(v), gated };
  }
  function pillars() {
    const seg = segmentOf();
    return seg.pillars.map(([name, ids]) => {
      let tw = 0, tv = 0;
      ids.forEach((k) => { const w = seg.weights[k] || 0; tw += w; tv += w * S.comps[k]; });
      return { name, share: tw, score: Math.round(tv / tw) };
    });
  }

  /* ---------------- client personality sims ---------------- */
  function openSims() {
    const seg = S.player.segment;
    const list = C.clientSims.slice().sort((a, b) => (b.segment === seg) - (a.segment === seg) || (b.pilot ? 1 : 0) - (a.pilot ? 1 : 0));
    openModal(`
      <div class="m-eyebrow">🛋️ Client Lounge · personality sims</div>
      <h2 class="m-title">Who will you meet?</h2>
      <button class="desk-cta" data-act="desk-setup"><span class="sim-face">🎧</span><span class="sim-body"><strong>Client Desk shift: unlimited generated clients</strong><span class="small muted">6–14 contacts per shift across calls, WhatsApp, SMS, email, chatbot, walk-ins and social media. Clients from all over Nigeria, the diaspora and abroad, at complexity levels 1–5.</span></span></button>
      <h3 class="pick-h small-h">Signature clients: deep conversations</h3>
      <p class="muted small">Read each client's personality, discover their hidden needs, and win their trust without breaking the rules. The same answer lands differently with different people.</p>
      <div class="sim-list">
        ${list.map((p) => {
          const segName = C.segments.find((s) => s.id === p.segment).name;
          const best = S.cx.best[p.id];
          return `<button class="sim-card" data-act="sim-start" data-p="${p.id}">
            <span class="sim-face">${p.emoji}</span>
            <span class="sim-body"><strong>${esc(p.name)}</strong><span class="small muted">${esc(p.kind)}</span>
              <span class="sim-tags"><span class="tag">${esc(segName)}</span>${p.pilot ? `<span class="tag tag-pilot">Pilot</span>` : ""}${p.segment === seg ? `<span class="tag tag-blended">Your office</span>` : ""}${best ? `<span class="tag">Best: ${{ closed: "Won", partial: "Partly won", lost: "Lost" }[best]}</span>` : ""}</span></span>
          </button>`;
        }).join("")}
      </div>
      <div class="m-foot muted">Each conversation uses one time slot and ${COST.scenario} energy.</div>
      <button class="btn wide" data-act="close">Not now</button>`);
  }

  function simStart(pid) {
    const p = C.clientSims.find((x) => x.id === pid);
    if (!p || !canAct(COST.scenario)) return;
    useSlot(COST.scenario);
    sim = { p, stage: -1, trust: p.startTrust, comp: 0, found: [], growth: false, log: [], guessRight: false };
    save();
    renderSim();
  }

  function simHeader() {
    const { p } = sim;
    const needs = p.needs.map((n) => sim.found.includes(n.id) ? `<li class="found">✅ ${esc(n.label)}</li>` : `<li class="hidden-need">🔒 Hidden need</li>`).join("");
    return `
      <div class="sim-head">
        <span class="sim-face big">${p.emoji}</span>
        <div><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.profile)}</div><div class="small">${esc(p.kind)}</div></div>
      </div>
      <div class="sim-meters">
        <div class="meter m-trust"><div class="meter-l"><span>🤝 Trust</span><strong>${sim.trust}</strong></div><div class="bar"><i style="width:${sim.trust}%"></i></div></div>
        <div class="sim-comp ${sim.comp < 0 ? "down" : "up"}">🛡️ Conduct ${sim.comp > 0 ? "+" : ""}${sim.comp}</div>
      </div>
      <ul class="sim-needs">${needs}</ul>`;
  }

  function renderSim() {
    const { p } = sim;
    const transcript = sim.log.slice(-4).map((l) => `<div class="bubble ${l.who}">${l.react ? `<span class="react">${l.react}</span>` : ""}${esc(l.text)}</div>`).join("");
    if (sim.stage === -1) {
      openModal(`${simHeader()}
        <div class="coach"><div class="coach-h">👀 Read the client</div><ul class="cues">${p.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
        <h2 class="m-title small-title">Which personality style is this?</h2>
        <div class="style-grid">${Object.entries(C.styles).map(([id, s]) => `<button class="choice" data-act="sim-guess" data-s="${id}"><span>${s.emoji} <strong>${s.name}</strong><span class="small muted block">${esc(s.reads)}</span></span></button>`).join("")}</div>`);
      return;
    }
    const st = p.stages[sim.stage];
    openModal(`${simHeader()}
      <div class="transcript">${transcript}<div class="bubble client now">${esc(st.client)}</div></div>
      <div class="m-eyebrow">Your response · ${sim.stage + 1} of ${p.stages.length}</div>
      <div class="choices">${shuffledIdx(st.options.length).map((i, pos) => `<button class="choice" data-act="sim-pick" data-i="${i}"><span class="choice-key">${"ABC"[pos]}</span><span>${esc(st.options[i].label)}</span></button>`).join("")}</div>`);
  }

  function simGuess(styleId) {
    const right = styleId === sim.p.style;
    sim.guessRight = right;
    S.cx.reads += 1;
    if (right) { S.cx.readsRight += 1; S.comps.comm = clamp(S.comps.comm + 2); }
    const st = C.styles[sim.p.style];
    toast(right ? `🎯 Good read: ${st.emoji} ${st.name}` : `Not quite. Watch how they react…`);
    sim.stage = 0;
    renderSim();
  }

  function simPick(i) {
    const { p } = sim;
    const o = p.stages[sim.stage].options[i];
    const d = (o.trust + (C.styles[p.style].mods[o.tag] || 0)) * 2;
    sim.trust = clamp(sim.trust + d);
    sim.comp += o.compliance || 0;
    if (o.reveals && !sim.found.includes(o.reveals)) sim.found.push(o.reveals);
    if (o.growth && (!o.needsFor || sim.found.includes(o.needsFor))) sim.growth = true;
    const react = d >= 6 ? "😊" : d >= 2 ? "🙂" : d >= -2 ? "😐" : "😠";
    sim.log.push({ who: "client", text: p.stages[sim.stage].client }, { who: "you", text: o.label }, { who: "client", text: o.reply, react });
    sim.stage += 1;
    if (sim.stage >= p.stages.length) finishSim(); else renderSim();
  }

  function finishSim() {
    const { p } = sim;
    const allFound = sim.found.length === p.needs.length;
    const breach = sim.comp <= -15;
    let result = sim.trust >= 70 && allFound ? "closed" : sim.trust >= 50 ? "partial" : "lost";
    if (breach && result === "closed") result = "partial";
    const value = result === "closed" ? p.value : result === "partial" ? Math.round(p.value * 0.3) : 0;
    const csat = clamp(Math.round(sim.trust / 20), 1, 5);
    const fx = {
      sales: (result === "closed" ? 6 : result === "partial" ? 3 : 0) + (sim.growth ? 2 : 0),
      comm: Math.round((sim.trust - p.startTrust) / 10),
      svc: p.segment === "middle" ? 1 : result === "closed" ? 5 : result === "partial" ? 2 : 0,
      reg: sim.comp >= 0 ? 2 : -4,
      eth: sim.comp >= 0 ? 1 : -3,
      ana: allFound ? 3 : 0,
      own: sim.growth ? 2 : 0,
    };
    Object.entries(fx).forEach(([k, v]) => (S.comps[k] = clamp(S.comps[k] + v)));
    S.trust = clamp(S.trust + (result === "closed" ? 5 : result === "partial" ? 1 : -5));
    S.compliance = clamp(S.compliance + (breach ? -10 : sim.comp > 0 ? 3 : 0));
    const cx = S.cx;
    cx.plays += 1; cx[result] += 1; cx.value += value; cx.csatSum += csat; if (sim.growth) cx.growth += 1;
    const rank = { closed: 3, partial: 2, lost: 1 }, label = { closed: "Won", partial: "Partly won", lost: "Lost" };
    if (!cx.best[p.id] || rank[result] > rank[cx.best[p.id]]) cx.best[p.id] = result;
    const xp = { closed: 40, partial: 20, lost: 8 }[result] + (sim.guessRight ? 10 : 0);
    gainXP(xp);
    S.stats[{ closed: "best", partial: "ok", lost: "poor" }[result]] += 1;
    const st = C.styles[p.style];
    const coach = `${p.name} is ${/^[AEIOU]/.test(st.name) ? "an" : "a"} ${st.name}. They want ${st.wants.toLowerCase()} Avoid ${st.avoid.toLowerCase()}`;
    S.journal.unshift({ day: S.day, title: "Client sim: " + p.name, rating: { closed: "best", partial: "ok", lost: "poor" }[result], choice: `${label[result]} · trust ${sim.trust} · ${sim.found.length}/${p.needs.length} needs found`, coach });
    bump("scn");
    record("completed", { id: "client-sim/" + p.id, name: p.name }, { success: result === "closed", score: { scaled: sim.trust / 100 }, extensions: { result, value, csat, compliance: sim.comp, needsFound: sim.found.length, styleRead: sim.guessRight } });
    save();

    openModal(`
      <div class="rating rating-${{ closed: "best", partial: "ok", lost: "poor" }[result]}">${label[result]} · +${xp} XP</div>
      <h2 class="m-title">${p.emoji} ${esc(p.name)}</h2>
      <p class="m-text">${esc(p.outcomes[result])}</p>
      ${breach ? `<div class="breach">🚨 Conduct breach in this conversation. In real life Compliance would review or reverse it, so the result is capped.</div>` : ""}
      <div class="kpis small-kpis">
        <div><strong>${naira(value)}</strong><span>${esc(p.valueLabel)}</span></div>
        <div><strong>${"★".repeat(csat)}${"☆".repeat(5 - csat)}</strong><span>client satisfaction</span></div>
        <div><strong>${sim.found.length}/${p.needs.length}</strong><span>needs discovered</span></div>
        <div><strong>${sim.growth ? "✅" : "—"}</strong><span>${esc(p.growthLabel)}</span></div>
      </div>
      <div class="deltas">${Object.entries(fx).filter(([, v]) => v).map(([k, v]) => chip(compById(k).name, v)).join("")}</div>
      <div class="coach"><div class="coach-h">${st.emoji} Personality: ${st.name} ${sim.guessRight ? "· you read them correctly 🎯" : "· you misread them"}</div>
        <p><strong>Signs:</strong> ${esc(st.reads)}</p><p><strong>Wants:</strong> ${esc(st.wants)}</p><p><strong>Avoid:</strong> ${esc(st.avoid)}</p>
        <p class="muted"><strong>Hidden needs:</strong> ${p.needs.map((n) => esc(n.label)).join(" · ")}</p></div>
      <button class="btn primary wide" data-act="sim-done">Back to work</button>`);
    sim = null;
  }

  /* ---------------- Client Desk: a shift of generated contacts ---------------- */
  const G = C.clientGen;
  const UNIT_NAMES = { cx: "Customer Experience", wealth: "Wealth Advisory", invest: "Investment Advisory" };
  const LEVELS = { starter: { label: "Starter", minC: 1, maxC: 2 }, standard: { label: "Standard", minC: 1, maxC: 4 }, expert: { label: "Expert", minC: 3, maxC: 5 } };
  let desk = null;
  const clockText = (m) => { const t = 9 * 60 + Math.round(m); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

  function openDeskSetup() {
    const def = S.player.segment === "middle" ? "wealth,invest" : "cx,wealth";
    openModal(`
      <div class="m-eyebrow">🎧 Client Desk · generated clients</div>
      <h2 class="m-title">Start a shift</h2>
      <p class="muted small">Contacts arrive by call, WhatsApp, SMS, email, chatbot hand-off, walk-in and social media, from across Nigeria, the diaspora and abroad. Every client is generated: new names, personalities, moods, tiers and cases each time. Prioritise wisely: response-time targets differ by channel.</p>
      <div class="lbl">Team</div>
      <div class="opt-row" data-group="units">${[["cx", "CX"], ["cx,wealth", "CX + Wealth"], ["wealth", "Wealth Advisory"], ["wealth,invest", "Wealth + Investment"], ["invest", "Investment Advisory"], ["cx,wealth,invest", "All pilot teams"]].map(([v, l]) => `<button class="opt ${v === def ? "on" : ""}" data-act="desk-opt" data-k="units" data-v="${v}">${l}</button>`).join("")}</div>
      <div class="lbl">Shift size</div>
      <div class="opt-row">${[[6, "Short · 6"], [10, "Standard · 10"], [14, "Peak · 14"]].map(([v, l]) => `<button class="opt ${v === 10 ? "on" : ""}" data-act="desk-opt" data-k="size" data-v="${v}">${l}</button>`).join("")}</div>
      <div class="lbl">Difficulty</div>
      <div class="opt-row">${Object.entries(LEVELS).map(([k, v]) => `<button class="opt ${k === "standard" ? "on" : ""}" data-act="desk-opt" data-k="level" data-v="${k}">${v.label} · ${"★".repeat(v.minC)}–${"★".repeat(v.maxC)}</button>`).join("")}</div>
      <div class="m-foot muted">A shift uses two time slots and 30 energy.</div>
      <div class="row"><button class="btn" data-act="sims">Back</button><button class="btn primary" data-act="desk-start">Start shift →</button></div>`);
    deskOpts = { units: def, size: 10, level: "standard" };
  }
  let deskOpts = null;

  function deskStart() {
    if (slotsLeft() < 2) { toast("🌙 A shift needs two free time slots. End the day first."); return; }
    if (S.energy < 30) { toast("😮‍💨 Too drained for a shift. Recharge first."); return; }
    useSlot(15); useSlot(15);
    const lv = LEVELS[deskOpts.level];
    const units = deskOpts.units.split(",");
    desk = { queue: G.generateShift(+deskOpts.size, { units, minC: lv.minC, maxC: lv.maxC, minutes: +deskOpts.size * 11 }), clock: 0, handled: [], cur: null, level: lv.label, units };
    save();
    renderDesk();
  }

  function renderDesk() {
    const arrived = desk.queue.filter((c) => c.arrival <= desk.clock && !c.done);
    const upcoming = desk.queue.filter((c) => c.arrival > desk.clock).length;
    const h = desk.handled, n = h.length;
    const fcr = n ? Math.round((h.filter((x) => x.result === "resolved").length / n) * 100) : 0;
    const sla = n ? Math.round((h.filter((x) => x.slaMet).length / n) * 100) : 0;
    const rows = arrived.sort((a, b) => (b.tier.vip ? 1 : 0) - (a.tier.vip ? 1 : 0) || (desk.clock - b.arrival) / b.ch.sla - (desk.clock - a.arrival) / a.ch.sla).map((c) => {
      const wait = desk.clock - c.arrival, pct = Math.min(100, Math.round((wait / c.ch.sla) * 100));
      return `<button class="q-row" data-act="desk-open" data-u="${c.uid}">
        <span class="q-ch" title="${esc(c.ch.label)}">${c.ch.emoji}</span>
        <span class="q-main"><span class="q-top"><strong>${esc(c.address)}</strong>${c.tier.vip ? `<span class="tag tag-pilot">${esc(c.tier.label)}</span>` : `<span class="tag">${esc(c.tier.label)}</span>`}<span class="tag">${c.origin === "ng" ? "🇳🇬" : "🌍"} ${esc(c.where)}</span><span class="q-stars" title="Complexity">${stars(c.complexity)}</span></span>
          <span class="q-msg">${esc(c.msg)}</span>
          <span class="q-sla"><span class="bar ${pct >= 100 ? "late" : pct >= 70 ? "warn" : ""}"><i style="width:${pct}%"></i></span><span class="small muted">${c.mood.emoji} waiting ${Math.round(wait)}m · target ${c.ch.sla}m</span></span></span>
      </button>`;
    }).join("");
    openModal(`
      <div class="desk-head"><div><div class="m-eyebrow">🎧 Client Desk · ${esc(desk.units.map((u) => UNIT_NAMES[u]).join(" + "))} · ${esc(desk.level)}</div>
        <h2 class="m-title">🕘 ${clockText(desk.clock)}</h2></div>
        <div class="desk-kpis"><span><strong>${n}</strong> handled</span><span><strong>${fcr}%</strong> FCR</span><span><strong>${sla}%</strong> SLA met</span></div></div>
      ${rows ? `<div class="queue">${rows}</div>` : `<div class="empty">Queue clear. ${upcoming ? "Next contact on its way…" : "No more contacts this shift."}</div>`}
      <p class="muted small">${upcoming} more contact${upcoming === 1 ? "" : "s"} expected this shift. VIPs and the longest-waiting contacts are sorted to the top.</p>
      <div class="row">${!rows && upcoming ? `<button class="btn" data-act="desk-wait">⏳ Wait for next contact</button>` : ""}<button class="btn ${!rows && !upcoming ? "primary" : ""}" data-act="desk-end">End shift & see scorecard</button></div>`);
  }

  function bestTag(style) { return Object.entries(C.styles[style].mods).sort((a, b) => b[1] - a[1])[0][0]; }

  function deskOpen(uid) {
    const c = desk.queue.find((x) => x.uid === uid);
    const wait = desk.clock - c.arrival;
    const late = wait > c.ch.sla;
    // Tone opener: 3 of 4, always including the best fit for this personality (so reading the client pays off)
    const openers = G.OPENERS[c.kind];
    const fitTag = openers.some((o) => o.tag === bestTag(c.style)) ? bestTag(c.style) : null;
    let ops = openers.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    if (fitTag && !ops.some((o) => o.tag === fitTag)) ops[0] = openers.find((o) => o.tag === fitTag);
    const when = c.ch.sla <= 15 ? "within the hour" : "end of day";
    const fill = (t) => t.replace(/\{t\}/g, c.address).replace(/\{when\}/g, when);
    const opener = { prompt: "Open the conversation", tone: true, options: ops.map((o) => ({ ...o, label: fill(o.label) })) };
    const closersBase = G.CLOSERS.slice().sort(() => Math.random() - 0.5).slice(0, 2).map((o) => ({ ...o, label: fill(o.label) }));
    const closeOpts = [...closersBase, G.ABRUPT];
    if (c.growth) closeOpts[1] = { tag: closersBase[1].tag, q: "best", growth: true, label: `${closersBase[1].label.replace(/"$/, "")} Before you go, may I also help with this: ${c.growth.toLowerCase()}?"` };
    const closer = { prompt: "Close the conversation", tone: true, options: closeOpts };
    desk.cur = { c, steps: [opener, ...c.stages, closer], i: 0, trust: clamp(c.startTrust - (late ? 15 : 0)), comp: 0, found: [], growth: false, poor: 0, fit: 0, fitN: 0, value: false, log: [{ who: "client", text: c.msg }], late, wait };
    renderContact();
  }

  function renderContact() {
    const { c, steps, i } = desk.cur, st = steps[i];
    const needs = c.needs.map((n) => desk.cur.found.includes(n.id) ? `<li class="found">✅ ${esc(n.label)}</li>` : `<li class="hidden-need">🔒 Hidden need</li>`).join("");
    openModal(`
      <div class="sim-head"><span class="sim-face big">${c.avatar}</span>
        <div><strong>${esc(c.address)}</strong>${c.org ? ` <span class="muted small">· ${esc(c.org)}</span>` : ""}<div class="muted small">${esc(c.occupation)} · ${c.age} · ${esc(c.where)}${c.tzNote ? ` · 🕑 ${esc(c.tzNote)}` : ""}</div>
        <div class="small">${c.ch.emoji} ${esc(c.ch.label)} · ${esc(c.tier.label)} · ${c.mood.emoji} ${esc(c.mood.label)} · ${stars(c.complexity)} · <em>${esc(c.title)}</em></div></div></div>
      <div class="coach slim"><div class="coach-h">👀 ${esc(c.cue)}</div><p class="small muted">${c.ch.emoji} ${esc(c.ch.tip)}${desk.cur.late ? ` <strong class="down">They waited ${Math.round(desk.cur.wait)}m, past the ${c.ch.sla}m target.</strong>` : ""}</p></div>
      <div class="sim-meters"><div class="meter m-trust"><div class="meter-l"><span>🤝 Trust</span><strong>${desk.cur.trust}</strong></div><div class="bar"><i style="width:${desk.cur.trust}%"></i></div></div>
        <div class="sim-comp ${desk.cur.comp < 0 ? "down" : "up"}">🛡️ Conduct ${desk.cur.comp > 0 ? "+" : ""}${desk.cur.comp}</div></div>
      <ul class="sim-needs">${needs}</ul>
      <div class="transcript">${desk.cur.log.slice(-3).map((l) => `<div class="bubble ${l.who}">${l.react ? `<span class="react">${l.react}</span>` : ""}${esc(l.text)}</div>`).join("")}</div>
      <div class="m-eyebrow">${esc(st.prompt)} · step ${i + 1} of ${steps.length}</div>
      <div class="choices">${shuffledIdx(st.options.length).map((k, pos) => `<button class="choice" data-act="desk-pick" data-i="${k}"><span class="choice-key">${"ABCD"[pos]}</span><span>${esc(st.options[k].label)}</span></button>`).join("")}</div>`);
  }

  const REPLY = {
    best: ["That's helpful, thank you.", "Okay, that makes sense.", "Good. Please go ahead.", "Thank you for explaining properly."],
    ok: ["Hmm, okay.", "If you say so.", "Fine, I guess."],
    poor: ["That's not what I expected from Meristem.", "Are you serious?", "This is not helpful at all.", "I'm not happy with this."],
  };

  function deskPick(k) {
    const cur = desk.cur, { c } = cur, st = cur.steps[cur.i], o = st.options[k];
    const mod = o.tag ? C.styles[c.style].mods[o.tag] || 0 : 0;
    let d;
    // Tone: reading the personality matters (fit +14, neutral +2, clash down to -13). Substance: right/wrong call.
    if (st.tone && o.q !== "poor") { d = mod * 3 + 2; cur.fitN += 1; if (mod > 0) cur.fit += 1; }
    else d = { best: 10, ok: 1, poor: -10 }[o.q] + mod;
    if (o.q === "poor") cur.poor += 1;
    cur.trust = clamp(cur.trust + d);
    cur.comp += o.compliance || 0;
    if (o.reveals && !cur.found.includes(o.reveals)) cur.found.push(o.reveals);
    if (o.growth && cur.found.length) cur.growth = true;
    if (o.value) cur.value = true;
    const react = d >= 6 ? "😊" : d >= 2 ? "🙂" : d >= -2 ? "😐" : "😠";
    const q = o.q || (d >= 2 ? "best" : d >= -2 ? "ok" : "poor");
    cur.log.push({ who: "you", text: o.label }, { who: "client", text: pick(REPLY[q === "best" && d < 2 ? "ok" : q]), react });
    cur.i += 1;
    if (cur.i >= cur.steps.length) finishContact(); else renderContact();
  }

  function finishContact() {
    const cur = desk.cur, { c } = cur;
    const minutes = cur.steps.length * c.ch.turn + c.complexity;
    const allFound = cur.found.length === c.needs.length;
    const result = cur.poor === 0 && allFound && cur.trust >= 55 && cur.comp >= 0 ? "resolved" : cur.trust >= 40 && cur.comp > -15 ? "partial" : "unresolved";
    const csat = clamp(Math.round(cur.trust / 20), 1, 5);
    const value = cur.value ? (result === "resolved" ? c.amount : result === "partial" ? Math.round(c.amount * 0.3) : 0) : 0;
    const rec = { uid: c.uid, name: c.address, caseTitle: c.title, unit: c.unit, channel: c.channel, result, csat, slaMet: !cur.late, minutes, breach: cur.comp < 0, value, growth: cur.growth, fit: cur.fit, fitN: cur.fitN, complexity: c.complexity };
    desk.handled.push(rec);
    c.done = true;
    desk.clock += minutes;
    record("completed", { id: "desk/" + c.caseId, name: c.title }, { success: result === "resolved", extensions: { ...rec, style: c.style, origin: c.origin, tier: c.tierId } });
    const st = C.styles[c.style];
    const best = c.stages.map((s) => s.options.find((o) => o.q === "best").label);
    const label = { resolved: "Resolved first time", partial: "Partly resolved", unresolved: "Unresolved / escalated" }[result];
    openModal(`
      <div class="rating rating-${{ resolved: "best", partial: "ok", unresolved: "poor" }[result]}">${label}</div>
      <h2 class="m-title">${c.avatar} ${esc(c.address)} · ${esc(c.title)}</h2>
      ${rec.breach ? `<div class="breach">🚨 Conduct issue in this contact. Compliance would follow up.</div>` : ""}
      <div class="kpis small-kpis">
        <div><strong>${stars(csat)}</strong><span>satisfaction</span></div>
        <div><strong>${rec.slaMet ? "✅" : "⏰"}</strong><span>response target ${c.ch.sla}m</span></div>
        <div><strong>${cur.found.length}/${c.needs.length}</strong><span>hidden needs found</span></div>
        <div><strong>${value ? G.fmt(value) : cur.growth ? "Growth ✅" : "—"}</strong><span>value / growth</span></div>
      </div>
      <div class="coach"><div class="coach-h">${st.emoji} They were ${/^[AEIOU]/.test(st.name) ? "an" : "a"} ${st.name} · tone fit ${cur.fit}/${cur.fitN}</div>
        <p class="small"><strong>Wants:</strong> ${esc(st.wants)} <strong>Avoid:</strong> ${esc(st.avoid)}</p>
        <p class="small muted"><strong>Hidden needs:</strong> ${c.needs.map((n) => esc(n.label)).join(" · ")}</p>
        <p class="small muted"><strong>Best practice:</strong> ${best.map(esc).join(" → ")}</p></div>
      <div class="row"><button class="btn primary" data-act="desk-back">Back to queue (${clockText(desk.clock)})</button></div>`);
    desk.cur = null;
  }

  function deskEnd() {
    const h = desk.handled, n = h.length;
    const abandoned = desk.queue.filter((c) => !c.done).length;
    const pct = (f) => (n ? Math.round((h.filter(f).length / n) * 100) : 0);
    const fcr = pct((x) => x.result === "resolved"), sla = pct((x) => x.slaMet);
    const csat = n ? (h.reduce((a, x) => a + x.csat, 0) / n).toFixed(1) : "–";
    const aht = n ? Math.round(h.reduce((a, x) => a + x.minutes, 0) / n) : 0;
    const breaches = h.filter((x) => x.breach).length;
    const value = h.reduce((a, x) => a + x.value, 0), growth = h.filter((x) => x.growth).length;
    const fitN = h.reduce((a, x) => a + x.fitN, 0), fit = fitN ? Math.round((h.reduce((a, x) => a + x.fit, 0) / fitN) * 100) : 0;
    const fx = {
      svc: Math.round((fcr / 100) * 8), comm: Math.round((fit / 100) * 6), ops: Math.round((sla / 100) * 4),
      sales: Math.min(6, h.filter((x) => x.value).length * 2 + growth), reg: breaches ? -3 * Math.min(3, breaches) : 2, eth: breaches ? -2 : 1,
      risk: Math.min(3, h.filter((x) => x.unit === "invest" && x.result === "resolved").length), own: growth ? 1 : 0,
    };
    Object.entries(fx).forEach(([k, v]) => (S.comps[k] = clamp(S.comps[k] + v)));
    S.compliance = clamp(S.compliance + (breaches ? -5 * breaches : 2));
    S.trust = clamp(S.trust + Math.round((fcr - 50) / 10));
    const cx = S.cx;
    cx.shifts = (cx.shifts || 0) + 1; cx.plays += n; cx.closed += h.filter((x) => x.result === "resolved").length; cx.partial += h.filter((x) => x.result === "partial").length; cx.lost += h.filter((x) => x.result === "unresolved").length + abandoned;
    cx.value += value; cx.growth += growth; cx.csatSum += h.reduce((a, x) => a + x.csat, 0);
    cx.slaMet = (cx.slaMet || 0) + h.filter((x) => x.slaMet).length; cx.slaTotal = (cx.slaTotal || 0) + n; cx.ahtSum = (cx.ahtSum || 0) + h.reduce((a, x) => a + x.minutes, 0);
    cx.reads += fitN; cx.readsRight += h.reduce((a, x) => a + x.fit, 0);
    const xp = h.reduce((a, x) => a + (x.result === "resolved" ? 12 : x.result === "partial" ? 5 : 1), 0) + (sla >= 80 && fcr >= 60 ? 30 : 0);
    gainXP(xp);
    bump("scn"); bump("scn");
    const tips = [];
    if (sla < 70) tips.push("Response times: pick up calls, chatbot hand-offs and WhatsApp first. Email can wait longer.");
    if (fcr < 60) tips.push("First-contact resolution: probe for the hidden need before you propose a fix.");
    if (fit < 60) tips.push("Tone fit: read the cue line. Drivers want brevity, Analyticals want data, Amiables want empathy, Expressives want energy.");
    if (breaches) tips.push(`Conduct: ${breaches} contact${breaches > 1 ? "s" : ""} included a conduct breach. These cap your performance.`);
    if (abandoned) tips.push(`${abandoned} contact${abandoned > 1 ? "s were" : " was"} never handled. In real life that's a missed client.`);
    if (!tips.length) tips.push("Excellent shift. Try a higher difficulty or a Peak shift next.");
    S.journal.unshift({ day: S.day, title: `Client Desk shift (${desk.level})`, rating: fcr >= 70 && sla >= 70 && !breaches ? "best" : fcr >= 40 ? "ok" : "poor", choice: `${n} handled · FCR ${fcr}% · SLA ${sla}% · CSAT ${csat} · AHT ${aht}m`, coach: tips.join(" ") });
    record("completed", { id: "desk/shift", name: "Client Desk shift" }, { extensions: { handled: n, abandoned, fcr, sla, csat, aht, breaches, value, growth, fit } });
    save();
    openModal(`
      <div class="m-eyebrow">🎧 Client Desk · end of shift (${clockText(desk.clock)})</div>
      <h2 class="m-title">Shift scorecard</h2>
      <div class="kpis">
        <div><strong>${n}</strong><span>contacts handled</span></div>
        <div><strong>${abandoned}</strong><span>abandoned</span></div>
        <div><strong>${fcr}%</strong><span>first-contact resolution</span></div>
        <div><strong>${sla}%</strong><span>response target met</span></div>
        <div><strong>${csat}</strong><span>avg satisfaction (of 5)</span></div>
        <div><strong>${aht}m</strong><span>avg handling time</span></div>
        <div><strong>${fit}%</strong><span>tone fit with personality</span></div>
        <div><strong>${breaches}</strong><span>conduct breaches</span></div>
        <div><strong>${G.fmt(value)}</strong><span>value won/retained</span></div>
        <div><strong>${growth}</strong><span>cross-sells / improvements</span></div>
      </div>
      <div class="deltas">${chip("XP", xp)}${Object.entries(fx).filter(([, v]) => v).map(([k, v]) => chip(compById(k).name, v)).join("")}</div>
      <div class="coach"><div class="coach-h">🧑🏾‍🏫 Coach's notes</div>${tips.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
      <table class="tbl small-tbl"><thead><tr><th>Client</th><th>Case</th><th></th><th>Result</th><th>CSAT</th></tr></thead><tbody>
        ${h.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.caseTitle)}</td><td>${G.CHANNELS[x.channel].emoji}</td><td>${{ resolved: "✅", partial: "➖", unresolved: "❌" }[x.result]}${x.breach ? " 🚨" : ""}</td><td>${x.csat}</td></tr>`).join("")}
      </tbody></table>
      <button class="btn primary wide" data-act="desk-done">Done</button>`);
    desk = null;
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
        ${meter("📈 Performance", perfIndex().score, "perf")}
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
          else if (l.sims) { act = `data-act="sims"`; badge = `<span class="pin sims">👥</span>`; cls = "simloc"; }
          const tag = act ? "button" : "div";
          return `<${tag} class="loc ${cls}" ${act}>${badge}<span class="loc-emoji">${l.emoji}</span><span class="loc-name">${esc(l.name)}</span><span class="loc-sub">${s ? esc(s.title) : esc(l.sub)}</span></${tag}>`;
        }).join("")}
      </div>
      <p class="muted small legend"><span class="pin inline">!</span> scenario waiting · <span class="pin rest inline">+⚡</span> recharge · <span class="pin quiz inline">?</span> knowledge check · <span class="pin sims inline">👥</span> client sims · grey = quiet right now</p>`;
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
      ${viewSegmentReport()}
      <table class="tbl"><thead><tr><th>Competency</th><th>Type</th><th>Start</th><th>Now</th><th>Δ</th></tr></thead><tbody>
        ${C.competencies.map((c) => { const d = S.comps[c.id] - S.baseline[c.id]; return `<tr class="${t.focus.includes(c.id) ? "focus" : ""}"><td>${esc(c.name)}</td><td>${c.group}</td><td>${S.baseline[c.id]}</td><td>${S.comps[c.id]}</td><td class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" : ""}${d}</td></tr>`; }).join("")}
      </tbody></table>
      <div class="row"><button class="btn" data-act="export">⬇️ Export learning records (xAPI JSON)</button><button class="btn danger" data-act="reset">Reset progress</button></div>
      <p class="muted small">${S.log.length} learning events recorded on this device. In production these flow to the Learning Record Store and the HR dashboard.</p>`;
  }

  function viewSegmentReport() {
    const seg = segmentOf(), pi = perfIndex(), cx = S.cx;
    const conv = cx.plays ? Math.round((cx.closed / cx.plays) * 100) : 0;
    const csat = cx.plays ? (cx.csatSum / cx.plays).toFixed(1) : "–";
    const reads = cx.reads ? Math.round((cx.readsRight / cx.reads) * 100) + "%" : "–";
    return `
      <div class="card seg-card"><div class="seg-top"><div><h3>${seg.emoji} ${esc(seg.name)} performance profile</h3><p class="muted small">${esc(seg.mix)}${track().leader ? " · leadership track: 25% Leadership blended in" : ""}</p></div>
        <div class="pi"><strong>${pi.score}</strong><span>Performance index${pi.gated ? " · capped (compliance)" : ""}</span></div></div>
        ${pillars().map((p) => `<div class="skill"><div class="skill-l"><span>${esc(p.name)} <em class="muted">(${p.share}% weight)</em></span><span>${p.score}</span></div><div class="bar"><i style="width:${p.score}%"></i></div></div>`).join("")}
      </div>
      <div class="card"><h3>🛋️ Client sims: front-office KPIs</h3>
        <div class="kpis">
          <div><strong>${cx.plays}</strong><span>client conversations</span></div>
          <div><strong>${conv}%</strong><span>won / resolved first time</span></div>
          <div><strong>${naira(cx.value)}</strong><span>value won / retained</span></div>
          <div><strong>${csat}</strong><span>avg satisfaction (of 5)</span></div>
          <div><strong>${cx.growth}</strong><span>cross-sells / improvements</span></div>
          <div><strong>${reads}</strong><span>personality reads / tone fit</span></div>
          <div><strong>${cx.slaTotal ? Math.round((cx.slaMet / cx.slaTotal) * 100) + "%" : "–"}</strong><span>response target met</span></div>
          <div><strong>${cx.slaTotal ? Math.round(cx.ahtSum / cx.slaTotal) + "m" : "–"}</strong><span>avg handling time</span></div>
          <div><strong>${cx.shifts || 0}</strong><span>desk shifts completed</span></div>
        </div></div>`;
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
        <h2 class="pick-h">Which office are you in?</h2>
        <div class="segs">${C.segments.map((g) => `<button class="seg ${setup.segment === g.id ? "on" : ""}" data-act="seg" data-s="${g.id}"><span class="trk-emoji">${g.emoji}</span><strong>${esc(g.name)}</strong><span class="small seg-mix">${esc(g.mix)}</span><span class="muted small">${esc(g.blurb)}</span></button>`).join("")}</div>
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
      case "seg": setup.segment = el.dataset.s; setup.name = (document.getElementById("pname") || {}).value || setup.name; renderSetup(); break;
      case "pick": setup.trackId = el.dataset.t; setup.segment = C.tracks.find((t) => t.id === el.dataset.t).segment; setup.name = (document.getElementById("pname") || {}).value || setup.name; renderSetup(); break;
      case "start": {
        const name = (document.getElementById("pname").value || "").trim();
        if (!name) { toast("Please enter your name to begin."); document.getElementById("pname").focus(); return; }
        newGame(name, setup.avatar, setup.trackId, setup.segment); tab = "world"; render();
        const t = track();
        openModal(`<div class="m-eyebrow">${t.emoji} ${esc(t.subsidiary)}</div><h2 class="m-title">Welcome, ${esc(name)}</h2>
          <p class="m-text">You start as <strong>${esc(t.role)}</strong>. Your goal is to reach <strong>${esc(t.target)}</strong>.</p>
          <ul class="howto"><li>🗺️ Locations marked <strong>!</strong> have a scenario waiting. Each one uses a time slot and energy.</li>
          <li>🛋️ Meet clients in the Client Lounge: read their personality, find their hidden needs, win their trust.</li>
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
      case "sims": openSims(); break;
      case "desk-setup": openDeskSetup(); break;
      case "desk-opt": deskOpts[el.dataset.k] = el.dataset.v; [...el.parentElement.children].forEach((b) => b.classList.toggle("on", b === el)); break;
      case "desk-start": deskStart(); render(); break;
      case "desk-open": deskOpen(el.dataset.u); break;
      case "desk-pick": deskPick(+el.dataset.i); break;
      case "desk-back": renderDesk(); break;
      case "desk-wait": desk.clock = Math.min(...desk.queue.filter((c) => c.arrival > desk.clock).map((c) => c.arrival)); renderDesk(); break;
      case "desk-end": deskEnd(); render(); break;
      case "desk-done": closeModal(); render(); break;
      case "sim-start": simStart(el.dataset.p); render(); break;
      case "sim-guess": simGuess(el.dataset.s); break;
      case "sim-pick": simPick(+el.dataset.i); break;
      case "sim-done": closeModal(); if (!S.finished && pending().length === 0) { S.finished = true; save(); showReadiness(); } render(); break;
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
    if (desk || modalBody.querySelector('[data-act="qanswer"], [data-act="sim-guess"], [data-act="sim-pick"]')) return;
    if (modalBody.querySelector('[data-act="after-scenario"]')) { afterScenario(); return; }
    closeModal(); render();
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalEl.hidden) closeModalSafe(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "pname") document.querySelector('[data-act="start"]').click(); });

  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = null; setup = { name: "", avatar: AVATARS[0], trackId: C.tracks[0].id, segment: C.tracks[0].segment }; tab = "world"; render();
  }

  function exportLog() {
    const blob = new Blob([JSON.stringify({ player: S.player, comps: S.comps, baseline: S.baseline, stats: S.stats, clientSims: S.cx, performance: perfIndex(), segment: S.player.segment, statements: S.log }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meriquest-${S.player.name.replace(/\W+/g, "_")}-records.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  render();
})();
