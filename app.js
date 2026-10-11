"use strict";
/* Little Bites — baby food tracker. Data lives in this browser (localStorage). No accounts, no servers. */

const LS_KEY = "littlebites.v1";
const RATINGS = [
  { v: 4, e: "😍", l: "Loved it" }, { v: 3, e: "🙂", l: "Liked it" },
  { v: 2, e: "😐", l: "Meh" }, { v: 1, e: "🤢", l: "Disliked" }
];
const REACTIONS = [
  { id: "none", l: "No reaction noticed", sev: 0 },
  { id: "mouth_red", l: "Redness around the mouth (where food touched)", sev: 1 },
  { id: "gas", l: "Gas or fussiness", sev: 1 },
  { id: "diarrhea", l: "Loose stools / diarrhea", sev: 1 },
  { id: "constip", l: "Constipation", sev: 1 },
  { id: "eczema", l: "Eczema flare", sev: 1 },
  { id: "hives", l: "Hives or widespread rash", sev: 2 },
  { id: "vomit", l: "Vomiting", sev: 2 },
  { id: "swelling", l: "Swelling of lips, tongue or face", sev: 3 },
  { id: "breathing", l: "Trouble breathing, wheezing, hoarse cry", sev: 3 },
  { id: "lethargy", l: "Pale, limp or unusually sleepy", sev: 3 }
];
const REACT_BY_ID = Object.fromEntries(REACTIONS.map(r => [r.id, r]));
const MEALS = [{ v: "breakfast", l: "Breakfast", e: "🌅" }, { v: "lunch", l: "Lunch", e: "☀️" }, { v: "dinner", l: "Dinner", e: "🌙" }, { v: "snack", l: "Snack", e: "🍪" }];
const PREPS = ["Puree", "Mashed", "Soft finger food / baby-led", "Mixed into another food", "Spoon-fed whole food", "Other"];
const COLORS = [
  { id: "red", l: "Red", c: "#d9534f" }, { id: "orange", l: "Orange", c: "#ee8456" }, { id: "yellow", l: "Yellow", c: "#d9a521" },
  { id: "green", l: "Green", c: "#3f9b62" }, { id: "purple", l: "Blue / purple", c: "#7a5cc2" }, { id: "white", l: "White / tan", c: "#a39a88" }
];
const STARTERS = ["avocado", "banana", "sweet_potato", "oatmeal", "pear", "carrot", "chicken", "egg", "yogurt", "peanut_butter", "lentils", "broccoli"];
const EMOJI_PICKS = ["🍎", "🍌", "🥭", "🍓", "🥕", "🌽", "🥦", "🍠", "🍗", "🥩", "🐟", "🥚", "🧀", "🥛", "🍞", "🍝", "🍚", "🥣", "🥜", "🌰", "🫘", "🍲", "🥞", "🍽️"];

/* ───────── state ───────── */
function defaults() {
  return { v: 1, baby: { name: "", bday: "" }, logs: [], custom: [], photos: {}, settings: { target: 2, theme: "auto", onboarded: false, lastExport: "", tipUntil: "" } };
}
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw), d = defaults();
    return { ...d, ...p, baby: { ...d.baby, ...(p.baby || {}) }, settings: { ...d.settings, ...(p.settings || {}) }, logs: p.logs || [], custom: p.custom || [], photos: p.photos || {} };
  } catch (e) { return defaults(); }
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); return true; }
  catch (e) { toast("Couldn't save — browser storage may be full or blocked."); return false; }
}
const ui = { tab: "home", foodQ: "", foodCat: "all", foodFilter: "all", calY: 0, calM: 0, calSel: "", stageTab: "", guideOpen: "" };

/* ───────── helpers ───────── */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => dstr(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
const fmtDate = (s, o) => s ? parseD(s).toLocaleDateString(undefined, o || { month: "short", day: "numeric" }) : "";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

let FM = {};
function rebuildFoodMap() { FM = {}; FOODS.forEach(f => FM[f.id] = f); S.custom.forEach(f => FM[f.id] = f); }
const food = id => FM[id];
const allFoods = () => FOODS.concat(S.custom);
const catName = id => (CATS.find(c => c.id === id) || {}).name || "Other";

function ageInfo(on) {
  if (!S.baby.bday) return null;
  on = on || new Date();
  const b = parseD(S.baby.bday);
  if (b > on) return null;
  const mk = m => { const dim = new Date(b.getFullYear(), b.getMonth() + m + 1, 0).getDate(); return new Date(b.getFullYear(), b.getMonth() + m, Math.min(b.getDate(), dim)); };
  let months = (on.getFullYear() - b.getFullYear()) * 12 + on.getMonth() - b.getMonth();
  if (mk(months) > on) months--;
  const days = Math.floor((on - mk(months)) / 864e5);
  return { months, weeks: Math.floor(days / 7), days, totalDays: Math.floor((on - b) / 864e5) };
}
function ageText(a) {
  if (!a) return "Set birthday";
  if (a.months < 1) return plural(Math.floor(a.totalDays / 7), "week") + (a.totalDays % 7 ? `, ${plural(a.totalDays % 7, "day")}` : "");
  if (a.months < 24) return plural(a.months, "month") + (a.weeks ? `, ${plural(a.weeks, "week")}` : "");
  const y = Math.floor(a.months / 12), m = a.months % 12;
  return plural(y, "year") + (m ? `, ${plural(m, "month")}` : "");
}
function stageFor(a) { const m = a ? a.months : 6; return m >= 12 ? STAGES[2] : m >= 9 ? STAGES[1] : STAGES[0]; }
function babyName() { return S.baby.name || "Baby"; }

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ───────── derived data ───────── */
function buildIndex() {
  const byFood = new Map();
  S.logs.forEach(l => { if (!food(l.f)) return; if (!byFood.has(l.f)) byFood.set(l.f, []); byFood.get(l.f).push(l); });
  const cmp = (a, b) => (b.d || "").localeCompare(a.d || "") || (b.t || 0) - (a.t || 0);
  byFood.forEach(arr => arr.sort(cmp));
  const firstLog = new Set();
  byFood.forEach(arr => {
    const dated = arr.filter(l => l.d);
    if (dated.length) firstLog.add(dated[dated.length - 1].id);
  });
  return { byFood, firstLog };
}
function foodStats(id, idx) {
  const logs = idx.byFood.get(id) || [];
  const dated = logs.filter(l => l.d);
  const rated = logs.filter(l => l.r);
  const avg = rated.length ? rated.reduce((s, l) => s + l.r, 0) / rated.length : 0;
  const sev = logs.reduce((m, l) => Math.max(m, ...(l.x || []).map(x => (REACT_BY_ID[x] || {}).sev || 0), 0), 0);
  return {
    logs, tries: logs.length, first: dated.length ? dated[dated.length - 1].d : "", last: dated.length ? dated[0].d : "",
    avg, face: avg ? RATINGS.find(r => r.v === Math.round(avg)) || RATINGS[1] : null, sev
  };
}
function allergenStats(aid, idx) {
  const logs = S.logs.filter(l => { const f = food(l.f); return f && f.a && f.a.includes(aid); });
  const dated = logs.filter(l => l.d).sort((a, b) => a.d.localeCompare(b.d));
  const t = today();
  const weeks = [3, 2, 1, 0].map(i => {
    const hi = addDays(t, -7 * i), lo = addDays(t, -7 * i - 6);
    return dated.filter(l => l.d >= lo && l.d <= hi).length;
  });
  const sev = logs.reduce((m, l) => Math.max(m, ...(l.x || []).map(x => (REACT_BY_ID[x] || {}).sev || 0), 0), 0);
  const thisWeek = weeks[3], target = S.settings.target;
  const status = !logs.length ? "none" : sev >= 2 ? "reaction" : thisWeek >= target ? "ontrack" : "due";
  const last = dated.length ? dated[dated.length - 1].d : "";
  return {
    total: logs.length, weeks, thisWeek, status, sev, first: dated.length ? dated[0].d : "", last,
    daysSince: last ? Math.floor((parseD(t) - parseD(last)) / 864e5) : null,
    foods: [...new Set(logs.map(l => l.f))]
  };
}
const STATUS_LABEL = { none: "Not yet introduced", ontrack: "On track", due: "Offer again soon", reaction: "Reaction noted" };

function rainbowCounts(idx) {
  const out = {}; COLORS.forEach(c => out[c.id] = 0);
  idx.byFood.forEach((_, id) => { const f = food(id); if (f && f.col && out[f.col] != null) out[f.col]++; });
  return out;
}

function suggestions(idx) {
  const a = ageInfo(), months = Math.max(a ? a.months : 6, 6);
  const rc = rainbowCounts(idx), minC = Math.min(...COLORS.map(c => rc[c.id]));
  const intro = new Set(ALLERGENS.filter(al => allergenStats(al.id, idx).total > 0).map(al => al.id));
  const catTried = {}; idx.byFood.forEach((_, id) => { const f = food(id); if (f) catTried[f.c] = (catTried[f.c] || 0) + 1; });
  const mainCats = ["fruit", "veg", "grain", "protein", "fish", "dairy", "legume", "nut"];
  const minCat = Math.min(...mainCats.map(c => catTried[c] || 0));
  const out = [];
  allFoods().forEach(f => {
    if (idx.byFood.has(f.id) || ["wait", "flavor", "drink"].includes(f.c) || (f.min || 6) > months) return;
    let s = 0; const why = [];
    const newAl = (f.a || []).filter(al => !intro.has(al));
    newAl.forEach(al => { s += (al === "peanut" || al === "egg") ? 4 : 3; });
    if (newAl.length) why.push(`New allergen: ${newAl.map(al => ALLERGENS.find(x => x.id === al).name.replace(" (dairy)", "")).join(", ")}`);
    if (f.fe) { s += 2.5; why.push("Iron-rich"); }
    if (f.col && rc[f.col] === minC) { s += 2; why.push(`Adds ${COLORS.find(c => c.id === f.col).l.toLowerCase()} to the rainbow`); }
    if (mainCats.includes(f.c) && (catTried[f.c] || 0) === minCat) s += 1;
    if (STARTERS.includes(f.id)) s += 1;
    if (!why.length && s >= 1) why.push("Good staple to try");
    if (s > 0) out.push({ f, s, why: why.slice(0, 2).join(" · ") });
  });
  return out.sort((x, y) => y.s - x.s || x.f.n.localeCompare(y.f.n)).slice(0, 6);
}

/* ───────── food visuals ───────── */
function fimg(f, size) {
  const cls = `fimg${size ? " " + size : ""}`;
  const ph = S.photos[f.id];
  if (ph) return `<span class="${cls}"><img alt="" src="${ph}"></span>`;
  if (f.photo) return `<span class="${cls}"><img alt="" src="${f.photo}"></span>`;
  if (f.e) return `<span class="${cls}" aria-hidden="true">${f.e}</span>`;
  let h = 0; for (const ch of f.n) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `<span class="${cls} letter" aria-hidden="true" style="background:hsl(${h} 45% 88%);color:hsl(${h} 45% 28%)">${esc(f.n[0].toUpperCase())}</span>`;
}
const ratingEmoji = r => (RATINGS.find(x => x.v === r) || {}).e || "";
function tagsFor(f) {
  let h = "";
  (f.a || []).forEach(a => h += `<span class="chip tag al">⚠ ${esc(ALLERGENS.find(x => x.id === a).name)}</span>`);
  if (f.fe) h += `<span class="chip tag fe">🩸 Iron-rich</span>`;
  if (f.risk) h += `<span class="chip tag w">Prep with care</span>`;
  return h;
}

/* ───────── sheets ───────── */
const root = () => $("#overlay-root");
function openSheet(title, body, foot, o) {
  const prev = $("#sheet-body"), keep = o && o.keepScroll && prev ? prev.scrollTop : 0;
  closeSheet();
  root().innerHTML = `<div class="overlay" data-act="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="grab"></div><header><h2>${(o && o.titleHtml) || esc(title)}</h2><button class="iconbtn" data-act="close" aria-label="Close">✕</button></header>
    <div class="body" id="sheet-body">${body}</div>${foot ? `<div class="foot">${foot}</div>` : ""}</div></div>`;
  document.body.classList.add("lock");
  if (keep) $("#sheet-body").scrollTop = keep;
}
function closeSheet() { root().innerHTML = ""; document.body.classList.remove("lock"); }
function dismiss() { closeSheet(); draft = null; cu = null; cf = null; }
const sheetOpen = () => !!$(".overlay");

/* ───────── routing & shell ───────── */
function route() {
  const h = (location.hash || "#/home").replace("#/", "");
  ui.tab = ["home", "foods", "calendar", "allergens", "guide", "report"].includes(h) ? h : "home";
  render();
}
function render(keepScroll) {
  rebuildFoodMap();
  document.querySelectorAll(".tabbar button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === ui.tab ? "page" : "false"));
  const v = $("#view"), idx = buildIndex();
  const fn = { home: viewHome, foods: viewFoods, calendar: viewCalendar, allergens: viewAllergens, guide: viewGuide, report: viewReport }[ui.tab];
  v.innerHTML = fn(idx);
  if (!keepScroll) window.scrollTo(0, 0);
  applyTheme();
}
function applyTheme() {
  const t = S.settings.theme;
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
}

/* ───────── HOME ───────── */
function viewHome(idx) {
  const a = ageInfo(), stage = stageFor(a);
  const catalogue = allFoods().filter(f => f.c !== "wait");
  const triedIds = [...idx.byFood.keys()].filter(id => food(id));
  const weekStart = addDays(today(), -6);
  const newThisWeek = [...idx.byFood.entries()].filter(([id, logs]) => { const d = logs.filter(l => l.d); return d.length && d[d.length - 1].d >= weekStart; }).length;
  const als = ALLERGENS.map(al => ({ al, st: allergenStats(al.id, idx) }));
  const introduced = als.filter(x => x.st.total > 0).length;
  const goal = 100;
  let h = "";

  h += `<section class="hero">
    <div class="bgemoji">🥣</div>
    <h1>${esc(babyName())}${S.baby.name ? "’s" : ""} food journey</h1>
    ${a ? `<div class="age">${esc(ageText(a))} old</div><span class="stagechip">Stage: ${esc(stage.label)}</span><p>${esc(stage.texture)}</p>` : `<p>Add ${S.baby.name ? esc(S.baby.name) + "’s" : "your baby’s"} birthday to see age-based guidance.</p>`}
    <div class="row wrap"><button class="btn" data-act="log">＋ Log a food</button>${a ? "" : `<button class="btn" data-act="settings">Set birthday</button>`}<button class="btn" data-act="catchup">⏪ Add foods tried so far</button></div>
  </section>`;

  if (S.logs.length >= 3 && shouldNudgeBackup()) {
    h += `<div class="callout warn" style="margin-top:14px"><button class="x" data-act="dismissTip" aria-label="Dismiss">✕</button><b>Back up your data.</b> Everything is saved on this device only, and iPhone/iPad can clear a website’s data if it isn’t used for a while. Add the app to your Home Screen (Share → Add to Home Screen) and export a backup now and then. <div style="margin-top:8px"><button class="btn sm" data-act="settings">Open backup options</button></div></div>`;
  }

  h += `<div class="grid3" style="margin-top:14px">
    <div class="card stat"><div class="n">${triedIds.length}</div><div class="l">Foods tried</div></div>
    <div class="card stat"><div class="n">${S.logs.length}</div><div class="l">Total feedings</div></div>
    <div class="card stat"><div class="n">${introduced}<small style="font-size:.9rem;color:var(--muted)">/9</small></div><div class="l">Allergens introduced</div></div>
    <div class="card stat"><div class="n">${newThisWeek}</div><div class="l">New foods this week</div></div>
  </div>`;

  /* allergens strip */
  h += `<div class="sectionhead"><h2>Allergen check-in</h2><a href="#/allergens">Details ›</a></div>
  <div class="mini-al">${als.map(({ al, st }) => `<div class="m ${st.status}" data-act="allergen" data-id="${al.id}"><span class="e">${al.emoji}</span>${esc(al.name.replace(" (dairy)", ""))}<small>${st.total ? `${st.thisWeek}/${S.settings.target} this wk` : "not yet"}</small></div>`).join("")}</div>`;
  const due = als.filter(x => x.st.status === "due");
  const rx = als.filter(x => x.st.status === "reaction");
  if (rx.length) h += `<div class="callout danger" style="margin-top:10px"><b>Reaction noted</b> for ${rx.map(x => esc(x.al.name)).join(", ")}. Talk with your pediatrician before offering again.</div>`;
  if (due.length) h += `<div class="callout warn" style="margin-top:10px"><b>Keep it going:</b> ${due.map(x => `${esc(x.al.name)} (${x.st.thisWeek}/${S.settings.target} this week)`).join(", ")}. Regular exposure helps maintain tolerance.</div>`;

  /* suggestions */
  const sg = suggestions(idx);
  if (sg.length) {
    h += `<div class="sectionhead"><h2>Try next</h2><a href="#/foods" data-act="goFoods">Browse all ›</a></div><div class="card list">`;
    sg.forEach(({ f, why }) => { h += `<div class="li click" data-act="food" data-id="${f.id}">${fimg(f, "sm")}<div class="grow"><div class="t">${esc(f.n)}</div><div class="s">${esc(why)}</div></div><span class="muted">›</span></div>`; });
    h += `</div>`;
  }

  /* variety */
  const rc = rainbowCounts(idx);
  h += `<div class="sectionhead"><h2>Eat the rainbow</h2></div><div class="card"><div class="rainbow">${COLORS.map(c => `<div class="rb" style="background:${c.c}">${rc[c.id]}<small>${c.l}</small></div>`).join("")}</div>
    <p class="small muted" style="margin:10px 0 0">Number of different fruits and vegetables tried in each colour.</p></div>`;

  h += `<div class="sectionhead"><h2>Variety</h2></div><div class="card stack">
    <div><div class="row between small"><b>Fun goal: ${goal} foods before age 1</b><span class="muted">${Math.min(triedIds.length, goal)} / ${goal}</span></div><div class="progress" style="margin-top:6px"><i style="width:${Math.min(100, triedIds.length / goal * 100)}%"></i></div></div>`;
  ["fruit", "veg", "grain", "protein", "fish", "dairy", "legume", "nut"].forEach(c => {
    const tot = catalogue.filter(f => f.c === c).length, tr = catalogue.filter(f => f.c === c && idx.byFood.has(f.id)).length;
    h += `<div><div class="row between small"><span>${CATS.find(x => x.id === c).emoji} ${catName(c)}</span><span class="muted">${tr} / ${tot}</span></div><div class="progress" style="margin-top:4px;height:7px"><i style="width:${tot ? tr / tot * 100 : 0}%"></i></div></div>`;
  });
  const fe = catalogue.filter(f => f.fe), feTried = fe.filter(f => idx.byFood.has(f.id));
  h += `<div><div class="row between small"><span>🩸 Iron-rich foods</span><span class="muted">${feTried.length} / ${fe.length}</span></div><div class="progress" style="margin-top:4px;height:7px"><i style="width:${fe.length ? feTried.length / fe.length * 100 : 0}%"></i></div></div></div>`;

  /* loves & retry */
  const stats = triedIds.map(id => ({ f: food(id), s: foodStats(id, idx) }));
  const loved = stats.filter(x => x.s.avg >= 3.5).sort((a, b) => b.s.tries - a.s.tries).slice(0, 12);
  const retry = stats.filter(x => x.s.avg && x.s.avg < 2.5).sort((a, b) => a.s.tries - b.s.tries).slice(0, 12);
  if (loved.length) h += `<div class="sectionhead"><h2>😍 Favourites</h2></div><div class="chips">${loved.map(x => `<button class="chip" data-act="food" data-id="${x.f.id}">${fimg(x.f, "xs")} ${esc(x.f.n)} · ${x.s.tries}×</button>`).join("")}</div>`;
  if (retry.length) h += `<div class="sectionhead"><h2>Not a fan yet — try again</h2></div><div class="chips">${retry.map(x => `<button class="chip" data-act="food" data-id="${x.f.id}">${fimg(x.f, "xs")} ${esc(x.f.n)} · ${x.s.tries}×</button>`).join("")}</div>
    <p class="small muted">Babies often need <b>8–15 exposures</b> before accepting a new food. Try different preparations and keep it low-pressure.</p>`;

  /* recent */
  const recent = S.logs.filter(l => food(l.f)).slice().sort((a, b) => (b.d || "").localeCompare(a.d || "") || (b.t || 0) - (a.t || 0)).slice(0, 8);
  h += `<div class="sectionhead"><h2>Recent</h2><a href="#/calendar">Calendar ›</a></div>`;
  if (!recent.length) h += `<div class="card empty"><div class="big">🍼</div><p>No foods logged yet.<br>Tap <b>Log a food</b> — or <b>Add foods tried so far</b> to quickly record what you’ve already done.</p></div>`;
  else h += `<div class="card list">${recent.map(logRow).join("")}</div>`;

  h += `<p class="footer">General information only, not medical advice. See the Guide tab for sources.</p>`;
  return h;
}
function shouldNudgeBackup() {
  const s = S.settings;
  if (s.tipUntil && today() < s.tipUntil) return false;
  if (!s.lastExport) return true;
  return today() > addDays(s.lastExport, 14);
}
function logRow(l) {
  const f = food(l.f); if (!f) return "";
  const rx = (l.x || []).filter(x => x !== "none").map(x => REACT_BY_ID[x] && REACT_BY_ID[x].l).filter(Boolean);
  const meal = MEALS.find(m => m.v === l.m);
  const sev = Math.max(0, ...(l.x || []).map(x => (REACT_BY_ID[x] || {}).sev || 0));
  return `<div class="li click" data-act="editlog" data-id="${l.id}">${fimg(f, "sm")}<div class="grow"><div class="t">${esc(f.n)} ${ratingEmoji(l.r)}</div>
    <div class="s">${l.d ? fmtDate(l.d, { weekday: "short", month: "short", day: "numeric" }) : "Earlier (no date)"}${meal ? " · " + meal.l : ""}${l.p ? " · " + esc(l.p) : ""}${rx.length ? ` · <span style="color:${sev >= 2 ? "var(--danger)" : "var(--warn)"}">${esc(rx.join(", "))}</span>` : ""}</div></div><span class="muted">›</span></div>`;
}

/* ───────── FOODS ───────── */
function foodMatches(f, idx) {
  const q = ui.foodQ.trim().toLowerCase();
  if (q && !(f.n.toLowerCase().includes(q) || catName(f.c).toLowerCase().includes(q) || (f.a || []).some(a => a.includes(q)))) return false;
  if (ui.foodCat !== "all" && f.c !== ui.foodCat) return false;
  const s = foodStats(f.id, idx);
  switch (ui.foodFilter) {
    case "tried": return s.tries > 0;
    case "new": return s.tries === 0;
    case "loved": return s.avg >= 3.5;
    case "disliked": return s.avg > 0 && s.avg < 2.5;
    case "allergen": return (f.a || []).length > 0;
    case "iron": return f.fe;
    case "reaction": return s.sev > 0;
  }
  return true;
}
function tileHtml(f, idx) {
  const s = foodStats(f.id, idx), locked = (f.min || 6) > 6 && ageInfo() && (f.min > ageInfo().months);
  return `<button class="tile ${s.tries ? "" : "untried"}" data-act="food" data-id="${f.id}" aria-label="${esc(f.n)}">
    ${s.tries ? `<span class="badge">${s.tries}×</span>` : ""}${s.face ? `<span class="rate">${s.face.e}</span>` : ""}${locked ? `<span class="lock" title="Wait until ${f.min} months">🔒</span>` : ""}
    ${fimg(f)}<span class="nm">${esc(f.n)}</span><span class="sub">${s.tries ? (s.last ? "last " + fmtDate(s.last) : "tried") : f.min > 6 ? `from ${f.min} mo` : "not yet"}</span>${(f.a || []).length ? `<span class="adot" title="Allergen"></span>` : ""}</button>`;
}
function viewFoods(idx) {
  const filters = [["all", "All"], ["tried", "Tried"], ["new", "Not yet tried"], ["loved", "😍 Loved"], ["disliked", "🤢 Disliked"], ["allergen", "Allergens"], ["iron", "🩸 Iron-rich"], ["reaction", "Reactions"]];
  let h = `<div class="pagehead row between"><div><h1>Foods</h1><p>${allFoods().length} foods with preparation, pairing and safety tips.</p></div><button class="btn sm soft" data-act="customfood">＋ Custom</button></div>
  <div class="searchbar"><input type="search" id="foodq" placeholder="Search foods…" value="${esc(ui.foodQ)}" aria-label="Search foods" autocomplete="off" autocapitalize="off"></div>
  <div class="hscroll" style="margin-top:10px">${[{ id: "all", name: "All", emoji: "✨" }].concat(CATS).map(c => `<button class="chip ${ui.foodCat === c.id ? "on" : ""}" data-act="setcat" data-v="${c.id}">${c.emoji} ${c.name}</button>`).join("")}</div>
  <div class="hscroll">${filters.map(([v, l]) => `<button class="chip ${ui.foodFilter === v ? "on" : ""}" data-act="setfilter" data-v="${v}">${l}</button>`).join("")}</div>
  <div id="foodlist">${foodListHtml(idx)}</div>`;
  return h;
}
function foodListHtml(idx) {
  const list = allFoods().filter(f => foodMatches(f, idx));
  if (!list.length) return `<div class="card empty"><div class="big">🔎</div><p>No foods match.<br><button class="btn sm soft" data-act="customfood">Add “${esc(ui.foodQ || "a custom food")}” as a custom food</button></p></div>`;
  const grouped = ui.foodCat === "all" && !ui.foodQ.trim() && ui.foodFilter === "all";
  if (!grouped) return `<div class="foodgrid" style="margin-top:6px">${list.sort((a, b) => a.n.localeCompare(b.n)).map(f => tileHtml(f, idx)).join("")}</div>`;
  let h = "";
  CATS.forEach(c => {
    const items = list.filter(f => f.c === c.id); if (!items.length) return;
    const tried = items.filter(f => idx.byFood.has(f.id)).length;
    h += `<div class="sectionhead"><h2>${c.emoji} ${c.name}</h2><span class="small muted">${tried}/${items.length} tried</span></div><div class="foodgrid">${items.map(f => tileHtml(f, idx)).join("")}</div>`;
  });
  return h;
}

/* food detail sheet */
function openFood(id, stageTab) {
  const f = food(id); if (!f) return;
  const idx = buildIndex(), s = foodStats(id, idx), a = ageInfo(), cur = stageFor(a);
  const tab = stageTab || ui.stageTab || cur.id;
  ui.stageTab = tab;
  const si = STAGES.findIndex(x => x.id === tab);
  const prep = f.custom ? f.prep : [f.p1, f.p2, f.p3][si];
  let b = `<div class="row" style="gap:14px;margin-top:4px">${fimg(f, "lg")}<div class="grow"><div class="muted small">${catName(f.c)}</div><div class="chips" style="margin-top:6px">${tagsFor(f) || '<span class="chip tag">No major allergens</span>'}</div></div></div>`;
  if ((f.min || 6) > 6 && (!a || a.months < f.min)) b += `<div class="callout danger" style="margin-top:12px"><b>Not yet.</b> ${esc(f.n)} is not recommended until ${f.min} months.</div>`;
  b += `<div class="grid3" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">
    <div class="card stat" style="padding:10px 4px"><div class="n" style="font-size:1.4rem">${s.tries}</div><div class="l">Tries</div></div>
    <div class="card stat" style="padding:10px 4px"><div class="n" style="font-size:1.1rem">${s.first ? fmtDate(s.first) : "–"}</div><div class="l">First</div></div>
    <div class="card stat" style="padding:10px 4px"><div class="n" style="font-size:1.1rem">${s.last ? fmtDate(s.last) : "–"}</div><div class="l">Last</div></div>
    <div class="card stat" style="padding:10px 4px"><div class="n" style="font-size:1.5rem">${s.face ? s.face.e : "–"}</div><div class="l">Verdict</div></div></div>`;
  if (s.sev >= 2) b += `<div class="callout danger" style="margin-top:12px"><b>Reaction logged.</b> Talk to your pediatrician before offering ${esc(f.n)} again.</div>`;
  if (f.risk) b += `<div class="callout warn" style="margin-top:12px"><b>⚠ Safety:</b> ${esc(f.risk)}</div>`;

  b += `<div class="sectionhead"><h2>How to prepare</h2></div>`;
  if (!f.custom) {
    b += `<div class="tabs" role="tablist">${STAGES.map(st => `<button class="${st.id === tab ? "on" : ""}" data-act="stagetab" data-id="${f.id}" data-v="${st.id}" role="tab">${st.short}${st.id === cur.id && a ? '<span class="here">Now</span>' : ""}</button>`).join("")}</div>`;
  }
  b += `<div class="card" style="margin-top:10px">${prep ? esc(prep) : '<span class="muted">No preparation notes yet.</span>'}</div>`;
  if (f.note) b += `<div class="callout" style="margin-top:10px">💡 ${esc(f.note)}</div>`;
  if (f.nut) b += `<p class="small muted" style="margin-top:10px"><b>Good for:</b> ${esc(f.nut)}</p>`;

  const pairs = (f.pair || []).map(food).filter(Boolean);
  if (pairs.length) b += `<div class="sectionhead"><h2>Good pairings</h2></div><div class="chips">${pairs.map(p => `<button class="chip" data-act="food" data-id="${p.id}">${fimg(p, "xs")} ${esc(p.n)}</button>`).join("")}</div>`;
  else if (f.pairText) b += `<div class="sectionhead"><h2>Pairings</h2></div><p>${esc(f.pairText)}</p>`;

  b += `<div class="sectionhead"><h2>History</h2></div>`;
  b += s.logs.length ? `<div class="card list">${s.logs.map(logRow).join("")}</div>` : `<p class="muted">Not logged yet.</p>`;
  b += `<div class="row wrap" style="margin-top:16px"><label class="btn sm sec" style="cursor:pointer">📷 ${S.photos[f.id] || f.photo ? "Change" : "Add"} photo<input type="file" accept="image/*" id="photoin" data-id="${f.id}" hidden></label>
    ${S.photos[f.id] ? `<button class="btn sm sec" data-act="rmphoto" data-id="${f.id}">Remove photo</button>` : ""}
    ${f.custom ? `<button class="btn sm sec" data-act="editcustom" data-id="${f.id}">✏️ Edit food</button>` : ""}</div>`;
  openSheet(f.n, b, `<button class="btn" data-act="log" data-food="${f.id}">＋ Log ${esc(f.n)}</button>`);
}

/* ───────── LOG SHEET ───────── */
let draft = null;
function openLog(o) {
  o = o || {};
  if (o.editId) {
    const l = S.logs.find(x => x.id === o.editId); if (!l) return;
    draft = { editId: l.id, foods: [l.f], d: l.d, undated: !l.d, m: l.m || "", r: l.r || 0, x: (l.x || []).slice(), p: l.p || "", n: l.n || "", q: "", cat: "all" };
  } else {
    draft = { editId: "", foods: o.foods || [], d: o.date || today(), undated: false, m: "", r: 0, x: [], p: "", n: "", q: "", cat: "all" };
  }
  renderLog();
}
function renderLog(keep) {
  const d = draft, edit = !!d.editId, sel = d.foods.map(food).filter(Boolean);
  let b = "";
  b += `<label class="f">Food${edit ? "" : "s"}</label><div class="chips" id="lg-sel">${selChips()}</div>`;
  if (!edit) {
    b += `<div class="searchbar" style="margin-top:10px"><input type="search" id="lg-q" placeholder="Search foods to add…" value="${esc(d.q)}" autocomplete="off" autocapitalize="off" aria-label="Search foods to add"></div>
    <div class="hscroll" style="margin-top:8px" id="lg-cats">${catChips(d.cat)}</div><div class="card list" id="lg-res" style="max-height:230px;overflow:auto;padding:4px 12px">${pickRows(d.foods, d.q, d.cat)}</div>`;
  }
  b += `<label class="f">When</label>
    <div class="row"><input type="date" id="lg-d" value="${esc(d.d || today())}" max="${today()}" ${d.undated ? "disabled" : ""} aria-label="Date"></div>
    <label class="check"><input type="checkbox" id="lg-und" ${d.undated ? "checked" : ""}> I don’t remember the date</label>
    <div class="chips" style="margin-top:4px">${MEALS.map(m => `<button class="chip ${d.m === m.v ? "on" : ""}" data-act="lgmeal" data-v="${m.v}">${m.e} ${m.l}</button>`).join("")}</div>
    <label class="f">How did they like it?</label>
    <div class="faces">${RATINGS.map(r => `<button class="${d.r === r.v ? "on" : ""}" data-act="lgrate" data-v="${r.v}"><span class="fc">${r.e}</span>${r.l}</button>`).join("")}</div>
    <label class="f">Reaction (check anything you noticed)</label>
    ${REACTIONS.map(r => `<label class="check"><input type="checkbox" data-rx="${r.id}" ${d.x.includes(r.id) ? "checked" : ""}> <span ${r.sev === 3 ? 'style="color:var(--danger);font-weight:700"' : ""}>${r.l}</span></label>`).join("")}
    ${d.x.some(x => (REACT_BY_ID[x] || {}).sev === 3) ? `<div class="callout danger"><b>Emergency signs:</b> swelling, trouble breathing or a limp/pale baby need <b>911 / emergency care now</b>. Don’t wait for the app.</div>` : d.x.some(x => (REACT_BY_ID[x] || {}).sev === 2) ? `<div class="callout warn"><b>Call your pediatrician</b> about hives or vomiting after a new food, and don’t offer it again until they advise.</div>` : ""}
    <label class="f">How was it served?</label>
    <select id="lg-p"><option value="">—</option>${PREPS.map(p => `<option ${d.p === p ? "selected" : ""}>${p}</option>`).join("")}</select>
    <label class="f">Notes</label><textarea id="lg-n" placeholder="Paired with…, how much they ate, anything to remember">${esc(d.n)}</textarea>`;
  if (edit) b += `<button class="btn danger block" style="margin-top:14px" data-act="deletelog">🗑 Delete this entry</button>`;
  openSheet(edit ? "Edit entry" : "Log a food", b, `<button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="savelog">${edit ? "Save changes" : `Save${sel.length > 1 ? " " + sel.length + " foods" : ""}`}</button>`, { keepScroll: keep });
}
function selChips() {
  const sel = draft.foods.map(food).filter(Boolean);
  if (!sel.length) return `<span class="muted small">Pick one or more foods below.</span>`;
  return sel.map(f => `<span class="chip on">${fimg(f, "xs")} ${esc(f.n)}${draft.editId ? "" : ` <button data-act="lgrm" data-id="${f.id}" style="background:none;border:0;color:inherit;font-weight:800" aria-label="Remove ${esc(f.n)}">✕</button>`}</span>`).join("");
}
function catChips(cur) {
  return [{ id: "all", name: "All", emoji: "✨" }].concat(CATS).map(c => `<button class="chip ${cur === c.id ? "on" : ""}" data-act="lgcat" data-v="${c.id}">${c.emoji} ${c.name}</button>`).join("");
}
function pickRows(selected, q, cat) {
  q = (q || "").trim().toLowerCase();
  const idx = buildIndex();
  let list = allFoods().filter(f => (cat === "all" || f.c === cat) && (!q || f.n.toLowerCase().includes(q)));
  list.sort((a, b) => a.n.localeCompare(b.n));
  if (!list.length) return `<p class="muted small" style="padding:10px 0">No match. <button class="btn sm soft" data-act="customfood">Add custom food</button></p>`;
  return list.slice(0, 80).map(f => {
    const on = selected.includes(f.id), n = (idx.byFood.get(f.id) || []).length;
    return `<div class="li click" data-act="lgpick" data-id="${f.id}">${fimg(f, "sm")}<div class="grow"><div class="t">${esc(f.n)}</div><div class="s">${n ? plural(n, "try") + " so far" : "Not tried yet"}</div></div><span style="font-size:1.3rem">${on ? "✅" : "⬜"}</span></div>`;
  }).join("");
}
function refreshPicker() {
  const r = $("#lg-res"); if (r) r.innerHTML = pickRows(draft.foods, draft.q, draft.cat);
  const s = $("#lg-sel"); if (s) s.innerHTML = selChips();
  const c = $("#lg-cats"); if (c) c.innerHTML = catChips(draft.cat);
  const sv = $('[data-act="savelog"]'); if (sv && !draft.editId) sv.textContent = `Save${draft.foods.length > 1 ? " " + draft.foods.length + " foods" : ""}`;
}
function saveLog() {
  const d = draft;
  if (!d.foods.length) { toast("Pick at least one food"); return; }
  const a = ageInfo();
  if (a) {
    const early = d.foods.map(food).filter(f => f && (f.min || 6) > a.months && f.min >= 8);
    if (early.length && !confirm(`${early.map(f => f.n).join(", ")} ${early.length > 1 ? "aren’t" : "isn’t"} recommended until ${Math.max(...early.map(f => f.min))} months. Log anyway?`)) return;
  }
  const date = d.undated ? "" : (d.d || today());
  const x = d.x.filter(v => v !== "none" || d.x.length === 1);
  if (d.editId) {
    const l = S.logs.find(l => l.id === d.editId);
    Object.assign(l, { f: d.foods[0], d: date, m: d.m, r: d.r, x, p: d.p, n: d.n.trim() });
  } else {
    d.foods.forEach(fid => S.logs.push({ id: uid(), f: fid, d: date, m: d.m, r: d.r, x, p: d.p, n: d.n.trim(), t: Date.now() }));
  }
  const severe = x.some(v => (REACT_BY_ID[v] || {}).sev === 3), moderate = x.some(v => (REACT_BY_ID[v] || {}).sev === 2);
  save(); closeSheet(); draft = null; render(true);
  if (severe) openSheet("Seek emergency care", `<div class="callout danger"><b>You logged signs of a serious reaction.</b><br>Swelling of the face/lips/tongue, trouble breathing, or a pale/limp baby can be anaphylaxis. <b>Call 911 (or your local emergency number) now.</b> If your doctor prescribed epinephrine, use it as instructed.</div>`, `<button class="btn" data-act="close">OK</button>`);
  else if (moderate) toast("Saved — please call your pediatrician about this reaction");
  else toast(d.editId ? "Entry updated" : "Logged ✓");
}

/* catch-up (bulk add) */
let cu = null;
function openCatchup() {
  cu = { step: 1, sel: {}, q: "", cat: "all", d: "", };
  renderCatchup();
}
function renderCatchup() {
  const ids = Object.keys(cu.sel);
  if (cu.step === 1) {
    const b = `<p class="muted" style="margin-top:0">Tap everything ${esc(babyName())} has already tried. You’ll set how many times and how much they liked each one on the next step.</p>
      <div class="searchbar"><input type="search" id="cu-q" placeholder="Search foods…" value="${esc(cu.q)}" autocomplete="off" autocapitalize="off"></div>
      <div class="hscroll" style="margin-top:8px" id="cu-cats">${cuCats()}</div><div id="cu-res" class="card list" style="padding:4px 12px">${cuRows()}</div>`;
    openSheet("Add foods tried so far", b, `<button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="cunext" id="cu-next">Next${ids.length ? " (" + ids.length + ")" : ""}</button>`);
  } else {
    let b = `<p class="muted" style="margin-top:0">For each food, set how many times it’s been served and how it went. Entries are saved without a date unless you choose one.</p>
      <label class="f">Date for all (optional)</label><input type="date" id="cu-d" value="${esc(cu.d)}" max="${today()}"><p class="small muted">Leave empty if you don’t remember. Undated entries still count toward totals and allergen tallies, just not the calendar or “this week” counts.</p>
      <div class="card list" style="margin-top:12px">`;
    ids.map(food).filter(Boolean).forEach(f => {
      const e = cu.sel[f.id];
      b += `<div style="padding:12px 0;border-bottom:1px solid var(--line)"><div class="row">${fimg(f, "sm")}<div class="grow t">${esc(f.n)}</div>
        <div class="row" style="gap:6px"><button class="iconbtn" style="width:36px;height:36px" data-act="cuminus" data-id="${f.id}" aria-label="Fewer">−</button><b style="min-width:26px;text-align:center">${e.n}×</b><button class="iconbtn" style="width:36px;height:36px" data-act="cuplus" data-id="${f.id}" aria-label="More">＋</button></div></div>
        <div class="row" style="gap:6px;margin-top:8px">${RATINGS.map(r => `<button class="chip ${e.r === r.v ? "on" : ""}" style="flex:1;justify-content:center" data-act="curate" data-id="${f.id}" data-v="${r.v}">${r.e}</button>`).join("")}</div></div>`;
    });
    b += `</div>`;
    openSheet("Review & save", b, `<button class="btn sec" data-act="cuback">Back</button><button class="btn" data-act="cusave">Save ${ids.length} food${ids.length === 1 ? "" : "s"}</button>`, { keepScroll: true });
  }
}
const cuCats = () => [{ id: "all", name: "All", emoji: "✨" }].concat(CATS).map(c => `<button class="chip ${cu.cat === c.id ? "on" : ""}" data-act="cucat" data-v="${c.id}">${c.emoji} ${c.name}</button>`).join("");
function cuRows() {
  const q = cu.q.trim().toLowerCase();
  const list = allFoods().filter(f => (cu.cat === "all" || f.c === cu.cat) && (!q || f.n.toLowerCase().includes(q)) && f.c !== "wait").sort((a, b) => cu.cat === "all" && !q ? CATS.findIndex(c => c.id === a.c) - CATS.findIndex(c => c.id === b.c) || a.n.localeCompare(b.n) : a.n.localeCompare(b.n));
  return list.map(f => `<div class="li click" data-act="cupick" data-id="${f.id}">${fimg(f, "sm")}<div class="grow"><div class="t">${esc(f.n)}</div><div class="s">${catName(f.c)}</div></div><span style="font-size:1.3rem">${cu.sel[f.id] ? "✅" : "⬜"}</span></div>`).join("") || `<p class="muted">No match.</p>`;
}
function cuRefresh() {
  const r = $("#cu-res"); if (r) r.innerHTML = cuRows();
  const c = $("#cu-cats"); if (c) c.innerHTML = cuCats();
  const n = $("#cu-next"); if (n) { const k = Object.keys(cu.sel).length; n.textContent = `Next${k ? " (" + k + ")" : ""}`; }
}

/* custom food */
let cf = null;
function openCustom(id, presetName) {
  const ex = id ? S.custom.find(x => x.id === id) : null;
  cf = ex ? { ...ex, a: (ex.a || []).slice() } : { id: "", n: presetName || "", e: "🍽️", c: "veg", a: [], fe: false, col: "", prep: "", pairText: "", note: "", custom: true };
  const b = `<label class="f">Name</label><input type="text" id="cf-n" value="${esc(cf.n)}" placeholder="e.g. Grandma’s lentil soup" autocapitalize="words">
    <label class="f">Picture</label><div class="chips">${EMOJI_PICKS.map(e => `<button class="chip ${cf.e === e ? "on" : ""}" data-act="cfemoji" data-v="${e}" style="font-size:1.3rem">${e}</button>`).join("")}</div>
    <input type="text" id="cf-e" value="${esc(cf.e)}" maxlength="4" placeholder="…or type any emoji" style="margin-top:8px" aria-label="Emoji">
    <p class="small muted">You can also add a photo from the food’s page after saving.</p>
    <label class="f">Category</label><select id="cf-c">${CATS.filter(c => c.id !== "wait").map(c => `<option value="${c.id}" ${cf.c === c.id ? "selected" : ""}>${c.emoji} ${c.name}</option>`).join("")}</select>
    <label class="f">Contains allergens</label><div>${ALLERGENS.map(al => `<label class="check"><input type="checkbox" data-cfal="${al.id}" ${cf.a.includes(al.id) ? "checked" : ""}> ${al.emoji} ${al.name}</label>`).join("")}</div>
    <label class="check"><input type="checkbox" id="cf-fe" ${cf.fe ? "checked" : ""}> 🩸 Iron-rich food</label>
    <label class="f">Colour (for the rainbow)</label><select id="cf-col"><option value="">None / not a fruit or veg</option>${COLORS.map(c => `<option value="${c.id}" ${cf.col === c.id ? "selected" : ""}>${c.l}</option>`).join("")}</select>
    <label class="f">How you prepare it</label><textarea id="cf-prep" placeholder="e.g. Blended smooth with a little breast milk">${esc(cf.prep || "")}</textarea>
    <label class="f">Pairings / notes</label><textarea id="cf-pair" placeholder="Goes well with…">${esc(cf.pairText || "")}</textarea>
    ${ex ? `<button class="btn danger block" style="margin-top:14px" data-act="delcustom" data-id="${ex.id}">🗑 Delete this food and its entries</button>` : ""}`;
  openSheet(ex ? "Edit custom food" : "Add custom food", b, `<button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="savecustom">Save food</button>`);
}
function saveCustom() {
  const n = $("#cf-n").value.trim(); if (!n) { toast("Give the food a name"); return; }
  cf.n = n; cf.e = $("#cf-e").value.trim(); cf.c = $("#cf-c").value; cf.fe = $("#cf-fe").checked; cf.col = $("#cf-col").value;
  cf.a = [...document.querySelectorAll("[data-cfal]")].filter(x => x.checked).map(x => x.dataset.cfal);
  cf.prep = $("#cf-prep").value.trim(); cf.pairText = $("#cf-pair").value.trim();
  cf.custom = true; cf.pair = []; cf.risk = ""; cf.nut = ""; cf.min = 6;
  if (cf.id) { const i = S.custom.findIndex(x => x.id === cf.id); S.custom[i] = cf; }
  else { cf.id = "c_" + uid(); S.custom.push(cf); }
  save(); rebuildFoodMap(); closeSheet();
  if (draft && draft.foods) { draft.foods.push(cf.id); renderLog(); } else { render(true); toast("Food saved"); }
}

/* ───────── CALENDAR ───────── */
function viewCalendar(idx) {
  const now = new Date();
  if (!ui.calY) { ui.calY = now.getFullYear(); ui.calM = now.getMonth(); }
  if (!ui.calSel) ui.calSel = today();
  const first = new Date(ui.calY, ui.calM, 1), start = new Date(first); start.setDate(1 - first.getDay());
  const byDate = {};
  S.logs.forEach(l => { if (l.d && food(l.f)) (byDate[l.d] = byDate[l.d] || []).push(l); });
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (i >= 35 && d.getMonth() !== ui.calM) break;
    const ds = dstr(d), logs = byDate[ds] || [];
    const uniq = [...new Set(logs.map(l => l.f))];
    const star = logs.some(l => idx.firstLog.has(l.id));
    cells += `<button class="day ${d.getMonth() !== ui.calM ? "out" : ""} ${ds === today() ? "today" : ""} ${ds === ui.calSel ? "sel" : ""} ${logs.length ? "has" : ""}" data-act="calday" data-date="${ds}" aria-label="${ds}, ${plural(logs.length, "entry").replace("entrys", "entries")}">
      ${d.getDate()}${star ? '<span class="star">⭐</span>' : ""}<span class="em">${uniq.slice(0, 4).map(id => { const f = food(id); return f.e || `<b style="font-size:.7em">${esc(f.n[0])}</b>`; }).join("")}</span>${uniq.length > 4 ? `<span class="more">+${uniq.length - 4}</span>` : ""}</button>`;
  }
  const undated = S.logs.filter(l => !l.d && food(l.f)).length;
  const monthLogs = S.logs.filter(l => l.d && l.d.startsWith(`${ui.calY}-${pad(ui.calM + 1)}`) && food(l.f));
  const monthNew = monthLogs.filter(l => idx.firstLog.has(l.id)).length;
  let h = `<div class="pagehead"><h1>Calendar</h1><p>Every feeding by day. ⭐ marks the first time a food was tried.</p></div>
  <div class="cal"><div class="row between" style="margin-bottom:8px"><button class="iconbtn" data-act="calprev" aria-label="Previous month">‹</button>
    <div class="center"><b style="font-size:1.1rem">${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b><div class="small muted">${plural(monthLogs.length, "feeding")} · ${monthNew} new food${monthNew === 1 ? "" : "s"}</div></div>
    <button class="iconbtn" data-act="calnext" aria-label="Next month">›</button></div>
    <div class="dow">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div>${d}</div>`).join("")}</div><div class="days">${cells}</div>
    <div class="row between" style="margin-top:10px"><button class="btn sm sec" data-act="caltoday">Today</button>${undated ? `<span class="small muted">${plural(undated, "undated entry").replace("entrys", "entries")} not shown</span>` : ""}</div></div>
  <div id="daypanel" style="margin-top:14px">${dayPanel(ui.calSel)}</div>`;
  return h;
}
function dayPanel(ds) {
  const logs = S.logs.filter(l => l.d === ds && food(l.f)).sort((a, b) => (a.t || 0) - (b.t || 0));
  const a = ageInfo(parseD(ds));
  return `<div class="card"><div class="row between"><div><h3>${fmtDate(ds, { weekday: "long", month: "long", day: "numeric" })}</h3>${a ? `<div class="small muted">${esc(babyName())} was ${esc(ageText(a))} old</div>` : ""}</div><button class="btn sm" data-act="log" data-date="${ds}">＋ Add</button></div>
  ${logs.length ? `<div class="list" style="margin-top:6px">${logs.map(logRow).join("")}</div>` : `<p class="muted" style="margin:10px 0 0">Nothing logged this day.</p>`}</div>`;
}

/* ───────── ALLERGENS ───────── */
function viewAllergens(idx) {
  const t = S.settings.target;
  let h = `<div class="pagehead"><h1>Allergen tracker</h1><p>The 9 major food allergens, how many times each has been offered, and whether you’re keeping up regular exposure.</p></div>
  <div class="callout">Current guidance (AAP, NIAID, ASCIA) is to introduce common allergens — especially <b>peanut and egg</b> — <b>around 6 months</b> rather than delaying, then keep them in the diet regularly. Evidence for the exact frequency is limited, so your weekly target is adjustable (now <b>${t}×/week</b>; change in Settings). Check eczema/allergy risk with your pediatrician first. <a href="#/guide" data-act="goGuideAllergy">Read the evidence ›</a></div><div class="stack" style="margin-top:14px">`;
  ALLERGENS.slice().sort((a, b) => a.order - b.order).forEach(al => {
    const st = allergenStats(al.id, idx), max = Math.max(1, t, ...st.weeks);
    const fl = ["4 wks ago", "3 wks ago", "2 wks ago", "This week"];
    h += `<div class="card al-card">
      <div class="al-head"><span class="big">${al.emoji}</span><div class="grow"><h3>${esc(al.name)}</h3><span class="status ${st.status}">${STATUS_LABEL[st.status]}</span></div>
        <button class="btn sm" data-act="logallergen" data-id="${al.id}">＋ Log</button></div>
      ${st.total ? `<div class="row wrap small muted" style="gap:14px"><span><b style="color:var(--ink)">${st.total}</b> total</span>${st.first ? `<span>First: <b style="color:var(--ink)">${fmtDate(st.first, { month: "short", day: "numeric" })}</b></span>` : ""}${st.last ? `<span>Last: <b style="color:var(--ink)">${st.daysSince === 0 ? "today" : st.daysSince + "d ago"}</b></span>` : ""}</div>
      <div class="weeks" aria-label="Exposures per week, last 4 weeks">${st.weeks.map((n, i) => `<div class="wk"><span class="wn">${n}</span><div class="bar ${n ? "" : "zero"}" style="height:${Math.max(6, n / max * 40)}px"></div><span class="wl">${fl[i]}</span></div>`).join("")}</div>
      <div class="small muted">Target: ${t}×/week · This week: <b style="color:var(--ink)">${st.thisWeek}</b></div>
      <div class="chips">${st.foods.map(food).filter(Boolean).map(f => `<button class="chip" data-act="food" data-id="${f.id}">${fimg(f, "xs")} ${esc(f.n)}</button>`).join("")}</div>` : `<div class="small muted">Not yet introduced. Foods that count: ${allFoods().filter(f => (f.a || []).includes(al.id) && f.c !== "wait").slice(0, 6).map(f => esc(f.n)).join(", ")}…</div>`}
      <details><summary class="small" style="cursor:pointer;font-weight:700;color:var(--brand)">How to introduce</summary><p class="small">${esc(al.how)}</p>${al.risk ? `<div class="callout warn small">${esc(al.risk)}</div>` : ""}</details>
      ${st.sev >= 2 ? `<div class="callout danger small"><b>Reaction logged.</b> Talk to your pediatrician before offering this allergen again.</div>` : ""}
    </div>`;
  });
  h += `</div><div class="callout warn" style="margin-top:14px"><b>Tips:</b> Introduce one new allergen at a time, early in the day, when baby is well. Many parents wait a couple of days before the next new allergen so any reaction is easy to trace. Introduce each allergen at home, in a small first amount, and watch for 2 hours. Know the <a href="#/guide" data-act="goGuideAllergy">signs of a reaction</a>.</div>`;
  return h;
}

/* ───────── GUIDE ───────── */
function viewGuide() {
  const a = ageInfo(), cur = stageFor(a);
  const stageHtml = STAGES.map(s => `<div class="stagecard ${s.id === cur.id && a ? "cur" : ""}"><b>${s.label}</b>${s.id === cur.id && a ? ' <span class="chip tag">Your baby now</span>' : ""}<p style="margin:6px 0"><b>Textures:</b> ${esc(s.texture)}</p><p style="margin:6px 0"><b>How much:</b> ${esc(s.amount)}</p><p style="margin:6px 0"><b>Skills:</b> ${esc(s.skills)}</p></div>`).join("");
  const matrix = `<p>The same food is prepared differently as baby’s chewing and swallowing skills develop. <b>Steamed or roasted soft early; raw (grated, thin) later.</b></p><table class="tbl"><tr><th>Food type</th><th>6–8 mo</th><th>9–11 mo</th><th>12+ mo</th></tr>${PREP_MATRIX.map(r => `<tr><td><b>${esc(r.type)}</b></td><td>${esc(r.s1)}</td><td>${esc(r.s2)}</td><td>${esc(r.s3)}</td></tr>`).join("")}</table>`;
  let h = `<div class="pagehead"><h1>Guide & safety</h1><p>Evidence-based basics for starting solids${a ? ` — tuned for ${esc(babyName())} at ${esc(ageText(a))}` : ""}.</p></div>
  <div class="callout warn">General information only — not medical advice. Follow your pediatrician, who knows your baby’s history. If something seems wrong, trust your instincts and call.</div><div style="margin-top:14px">`;
  GUIDE_SECTIONS.forEach(s => {
    const body = s.html === "STAGES" ? stageHtml : s.html === "PREPMATRIX" ? matrix : s.html;
    const open = ui.guideOpen === s.id || (!ui.guideOpen && s.id === "ready" && false);
    h += `<details class="acc" id="g-${s.id}" ${open ? "open" : ""}><summary><span style="font-size:1.4rem">${s.icon}</span>${esc(s.title)}</summary><div class="acc-body">${body}</div></details>`;
  });
  h += `</div><div class="sectionhead"><h2>Sources</h2></div><div class="card"><ul style="margin:0;padding-left:20px">${SOURCES.map(s => `<li style="margin:6px 0"><a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join("")}</ul>
  <p class="small muted">Guidance changes over time; check these sources and your pediatrician for the latest recommendations.</p></div>`;
  return h;
}

/* ───────── REPORT (print / PDF) ───────── */
function viewReport(idx) {
  const a = ageInfo();
  const rows = [...idx.byFood.keys()].map(id => ({ f: food(id), s: foodStats(id, idx) })).filter(x => x.f).sort((x, y) => (x.s.first || "9999").localeCompare(y.s.first || "9999") || x.f.n.localeCompare(y.f.n));
  let h = `<div class="pagehead row between noprint"><div><h1>Summary report</h1><p>For your pediatrician. Use Print → Save as PDF.</p></div><button class="btn" data-act="print">🖨 Print / PDF</button></div>
  <div class="card"><h2>${esc(babyName())} — food introduction summary</h2><p class="muted">Generated ${fmtDate(today(), { year: "numeric", month: "long", day: "numeric" })}${a ? ` · Age ${esc(ageText(a))}` : ""}${S.baby.bday ? ` · Born ${fmtDate(S.baby.bday, { year: "numeric", month: "long", day: "numeric" })}` : ""}</p>
  <h3 style="margin-top:14px">Major allergens</h3><table class="tbl"><tr><th>Allergen</th><th>First offered</th><th>Times offered</th><th>Last 4 weeks (oldest→newest)</th><th>Reactions</th></tr>
  ${ALLERGENS.map(al => { const st = allergenStats(al.id, idx); const rx = new Set(); S.logs.forEach(l => { const f = food(l.f); if (f && (f.a || []).includes(al.id)) (l.x || []).forEach(x => x !== "none" && REACT_BY_ID[x] && rx.add(REACT_BY_ID[x].l)); }); return `<tr><td>${al.emoji} ${esc(al.name)}</td><td>${st.first ? fmtDate(st.first, { year: "numeric", month: "short", day: "numeric" }) : st.total ? "date unknown" : "—"}</td><td>${st.total}</td><td>${st.weeks.join(" · ")}</td><td>${rx.size ? esc([...rx].join("; ")) : "None logged"}</td></tr>`; }).join("")}</table>
  <h3 style="margin-top:14px">All foods tried (${rows.length})</h3>
  ${rows.length ? `<table class="tbl"><tr><th>Food</th><th>First</th><th>Times</th><th>Verdict</th><th>Reactions</th></tr>${rows.map(({ f, s }) => { const rx = new Set(); s.logs.forEach(l => (l.x || []).forEach(x => x !== "none" && REACT_BY_ID[x] && rx.add(REACT_BY_ID[x].l))); return `<tr><td>${f.e || ""} ${esc(f.n)}${(f.a || []).length ? " ⚠" : ""}</td><td>${s.first ? fmtDate(s.first, { year: "numeric", month: "short", day: "numeric" }) : "—"}</td><td>${s.tries}</td><td>${s.face ? s.face.e + " " + s.face.l : "—"}</td><td>${rx.size ? esc([...rx].join("; ")) : "—"}</td></tr>`; }).join("")}</table>` : '<p class="muted">Nothing logged yet.</p>'}
  <p class="small muted">⚠ = contains a major allergen. Generated by Little Bites from parent-entered data.</p></div>`;
  return h;
}

/* ───────── SETTINGS / ONBOARDING / DATA ───────── */
function openSettings() {
  const s = S.settings;
  const b = `<label class="f">Baby’s name</label><input type="text" id="st-name" value="${esc(S.baby.name)}" placeholder="Name (optional)" autocapitalize="words">
    <label class="f">Birthday</label><input type="date" id="st-bday" value="${esc(S.baby.bday)}" max="${today()}">
    <p class="small muted">Used to show age and highlight the right preparation stage. ${S.baby.bday ? `Currently ${esc(ageText(ageInfo()))} old.` : ""}</p>
    <label class="f">Allergen exposure target</label>
    <select id="st-target">${[1, 2, 3, 4].map(n => `<option value="${n}" ${s.target === n ? "selected" : ""}>${n} time${n > 1 ? "s" : ""} per week for each allergen</option>`).join("")}</select>
    <p class="small muted">Evidence for the ideal frequency is limited (guidance ranges from about weekly to 2–3×/week). Choose what your pediatrician recommends.</p>
    <label class="f">Appearance</label><select id="st-theme">${[["auto", "Match device"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<option value="${v}" ${s.theme === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div class="sectionhead"><h2>Your data</h2></div>
    <div class="callout">Everything is stored privately on <b>this device and browser</b> (not uploaded anywhere). To use another device, export a backup here and import it there. <b>iPhone tip:</b> tap Share → <b>Add to Home Screen</b> for an app-like experience and more reliable storage.</div>
    <div class="row wrap" style="margin-top:12px"><button class="btn sm sec" data-act="exportjson">⬇ Export backup</button><button class="btn sm sec" data-act="copyjson">📋 Copy backup</button><button class="btn sm sec" data-act="exportcsv">📄 Export CSV</button>
      <a class="btn sm sec" href="#/report" data-act="close">🩺 Pediatrician report</a></div>
    <label class="f">Restore from backup</label>
    <div class="row wrap"><label class="btn sm sec" style="cursor:pointer">📂 Choose file<input type="file" id="importfile" accept=".json,application/json" hidden></label><button class="btn sm sec" data-act="pasteimport">Paste backup text</button></div>
    <div class="sectionhead"><h2>About</h2></div>
    <p class="small muted">Little Bites is a free personal tracker. Food guidance is summarised from the CDC, AAP, NIAID, FDA and ASCIA (see Guide → Sources) and is not a substitute for medical advice. Photos you add are stored on this device only.</p>
    <button class="btn danger block" style="margin-top:12px" data-act="resetall">Erase all data</button>`;
  openSheet("Settings", b, `<button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="savesettings">Save</button>`);
}
function saveSettings() {
  S.baby.name = $("#st-name").value.trim(); S.baby.bday = $("#st-bday").value;
  S.settings.target = parseInt($("#st-target").value, 10) || 2; S.settings.theme = $("#st-theme").value; S.settings.onboarded = true;
  save(); closeSheet(); render(true); toast("Settings saved");
}
function openWelcome() {
  const b = `<p style="margin-top:0">Track every first food, spot allergen gaps, and get age-based prep and safety tips. Your data stays on this device.</p>
    <label class="f">Baby’s name</label><input type="text" id="wl-name" placeholder="Name (optional)" autocapitalize="words">
    <label class="f">Birthday</label><input type="date" id="wl-bday" max="${today()}"><p class="small muted">We use this to work out age and highlight the right textures for each stage.</p>
    <div class="callout warn">This app offers general guidance, not medical advice. Talk with your pediatrician before starting solids, especially about allergen introduction.</div>`;
  openSheet("Welcome to Little Bites 🥄", b, `<button class="btn sec" data-act="welcomeskip">Skip for now</button><button class="btn" data-act="welcomesave">Get started</button>`);
}
function download(name, text, type) {
  const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function backupText() { return JSON.stringify({ app: "littlebites", exported: new Date().toISOString(), data: S }, null, 1); }
function markExported() { S.settings.lastExport = today(); save(); }
function importText(txt) {
  let p; try { p = JSON.parse(txt); } catch (e) { toast("That doesn’t look like a backup file"); return; }
  const d = p && p.data ? p.data : p;
  if (!d || !Array.isArray(d.logs)) { toast("Backup not recognised"); return; }
  if (!confirm(`Replace the data on this device with the backup (${d.logs.length} entries)?`)) return;
  S = { ...defaults(), ...d, baby: { ...defaults().baby, ...(d.baby || {}) }, settings: { ...defaults().settings, ...(d.settings || {}) }, custom: d.custom || [], photos: d.photos || {} };
  save(); closeSheet(); render(true); toast("Backup restored ✓");
}
function exportCsv() {
  const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const rows = [["Date", "Meal", "Food", "Category", "Allergens", "Rating", "Reactions", "Served as", "Notes"].map(q).join(",")];
  S.logs.slice().sort((a, b) => (a.d || "").localeCompare(b.d || "")).forEach(l => {
    const f = food(l.f); if (!f) return;
    rows.push([l.d || "", l.m || "", f.n, catName(f.c), (f.a || []).join("/"), (RATINGS.find(r => r.v === l.r) || {}).l || "", (l.x || []).map(x => (REACT_BY_ID[x] || {}).l).filter(Boolean).join("; "), l.p || "", l.n || ""].map(q).join(","));
  });
  download("little-bites-log.csv", rows.join("\n"), "text/csv"); toast("CSV exported");
}
function resizeImage(file, size) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const c = document.createElement("canvas"); c.width = c.height = size; const s = Math.min(img.width, img.height); c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .82)); };
    img.onerror = rej; img.src = url;
  });
}

/* ───────── events ───────── */
document.addEventListener("click", e => {
  const tab = e.target.closest("[data-tab]");
  if (tab) { location.hash = "#/" + tab.dataset.tab; return; }
  const el = e.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, v = el.dataset.v;
  switch (act) {
    case "overlay": if (e.target === el) dismiss(); break;
    case "close": dismiss(); break;
    case "log": openLog({ foods: el.dataset.food ? [el.dataset.food] : [], date: el.dataset.date }); break;
    case "catchup": openCatchup(); break;
    case "settings": openSettings(); break;
    case "food": openFood(id); break;
    case "editlog": openLog({ editId: id }); break;
    case "stagetab": openFood(id, v); break;
    case "goFoods": break;
    case "goGuideAllergy": ui.guideOpen = "allergy"; if (ui.tab === "guide") { render(); } break;
    case "allergen": location.hash = "#/allergens"; break;
    case "setcat": ui.foodCat = v; $("#view").innerHTML = viewFoods(buildIndex()); break;
    case "setfilter": ui.foodFilter = v; $("#view").innerHTML = viewFoods(buildIndex()); break;
    case "customfood": openCustom(null, ui.foodQ || (draft ? draft.q : "")); break;
    case "editcustom": openCustom(id); break;
    case "cfemoji": cf.e = v; $("#cf-e").value = v; document.querySelectorAll('[data-act="cfemoji"]').forEach(b => b.classList.toggle("on", b.dataset.v === v)); break;
    case "savecustom": saveCustom(); break;
    case "delcustom": if (confirm("Delete this food and all of its logged entries?")) { S.logs = S.logs.filter(l => l.f !== id); S.custom = S.custom.filter(x => x.id !== id); delete S.photos[id]; save(); closeSheet(); render(true); } break;
    case "rmphoto": delete S.photos[id]; save(); openFood(id); render(true); break;
    /* log sheet */
    case "lgpick": { const i = draft.foods.indexOf(id); if (i >= 0) draft.foods.splice(i, 1); else draft.foods.push(id); refreshPicker(); break; }
    case "lgrm": draft.foods = draft.foods.filter(x => x !== id); refreshPicker(); break;
    case "lgcat": draft.cat = v; refreshPicker(); break;
    case "lgmeal": draft.m = draft.m === v ? "" : v; collectLog(); renderLog(true); break;
    case "lgrate": draft.r = draft.r === +v ? 0 : +v; collectLog(); renderLog(true); break;
    case "savelog": collectLog(); saveLog(); break;
    case "deletelog": if (confirm("Delete this entry?")) { S.logs = S.logs.filter(l => l.id !== draft.editId); save(); closeSheet(); draft = null; render(true); toast("Entry deleted"); } break;
    /* catch-up */
    case "cupick": if (cu.sel[id]) delete cu.sel[id]; else cu.sel[id] = { n: 1, r: 0 }; cuRefresh(); break;
    case "cucat": cu.cat = v; cuRefresh(); break;
    case "cunext": if (!Object.keys(cu.sel).length) { toast("Pick at least one food"); break; } cu.step = 2; renderCatchup(); break;
    case "cuback": cu.d = ($("#cu-d") || {}).value || ""; cu.step = 1; renderCatchup(); break;
    case "cuplus": cu.sel[id].n = Math.min(60, cu.sel[id].n + 1); cu.d = $("#cu-d").value; renderCatchup(); break;
    case "cuminus": cu.sel[id].n = Math.max(1, cu.sel[id].n - 1); cu.d = $("#cu-d").value; renderCatchup(); break;
    case "curate": cu.sel[id].r = cu.sel[id].r === +v ? 0 : +v; cu.d = $("#cu-d").value; renderCatchup(); break;
    case "cusave": {
      const date = $("#cu-d").value; let n = 0;
      Object.entries(cu.sel).forEach(([fid, e]) => { for (let i = 0; i < e.n; i++) { S.logs.push({ id: uid(), f: fid, d: date, m: "", r: e.r, x: [], p: "", n: "", t: Date.now() + n }); n++; } });
      save(); closeSheet(); const k = Object.keys(cu.sel).length; cu = null; render(true); toast(`Added ${k} food${k === 1 ? "" : "s"} ✓`); break;
    }
    /* calendar */
    case "calprev": ui.calM--; if (ui.calM < 0) { ui.calM = 11; ui.calY--; } render(true); break;
    case "calnext": ui.calM++; if (ui.calM > 11) { ui.calM = 0; ui.calY++; } render(true); break;
    case "caltoday": ui.calY = 0; ui.calSel = today(); render(true); break;
    case "calday": ui.calSel = el.dataset.date; render(true); setTimeout(() => $("#daypanel") && $("#daypanel").scrollIntoView({ block: "nearest", behavior: "smooth" }), 30); break;
    case "logallergen": {
      const al = ALLERGENS.find(a => a.id === id);
      const list = allFoods().filter(f => (f.a || []).includes(id) && f.c !== "wait");
      openSheet(`Log ${al.name}`, `<p class="muted" style="margin-top:0">Which food contained ${esc(al.name.toLowerCase())}?</p><div class="card list">${list.map(f => `<div class="li click" data-act="log" data-food="${f.id}">${fimg(f, "sm")}<div class="grow"><div class="t">${esc(f.n)}</div></div><span class="muted">›</span></div>`).join("")}</div>`);
      break;
    }
    /* settings & data */
    case "savesettings": saveSettings(); break;
    case "dismissTip": S.settings.tipUntil = addDays(today(), 7); save(); render(true); break;
    case "exportjson": download(`little-bites-backup-${today()}.json`, backupText(), "application/json"); markExported(); toast("Backup downloaded"); break;
    case "copyjson": (navigator.clipboard ? navigator.clipboard.writeText(backupText()) : Promise.reject()).then(() => { markExported(); toast("Backup copied — paste it somewhere safe"); }, () => toast("Couldn't copy; use Export instead")); break;
    case "exportcsv": exportCsv(); break;
    case "pasteimport": {
      const b = `<p class="muted" style="margin-top:0">Paste the backup text you copied from another device.</p><textarea id="paste-box" style="min-height:160px" placeholder="{ ... }"></textarea>`;
      openSheet("Restore from text", b, `<button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="doPaste">Restore</button>`); break;
    }
    case "doPaste": importText($("#paste-box").value); break;
    case "resetall": if (confirm("Erase ALL data on this device? This cannot be undone.") && confirm("Really erase everything? Export a backup first if unsure.")) { S = defaults(); save(); closeSheet(); render(); openWelcome(); } break;
    case "welcomesave": S.baby.name = $("#wl-name").value.trim(); S.baby.bday = $("#wl-bday").value; S.settings.onboarded = true; save(); closeSheet(); render(true); break;
    case "welcomeskip": S.settings.onboarded = true; save(); closeSheet(); render(true); break;
    case "print": window.print(); break;
  }
});
function collectLog() {
  if (!draft || !$("#lg-d")) return;
  draft.d = $("#lg-d").value || draft.d; draft.undated = $("#lg-und").checked; draft.p = $("#lg-p").value; draft.n = $("#lg-n").value;
}
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "foodq") { ui.foodQ = t.value; $("#foodlist").innerHTML = foodListHtml(buildIndex()); }
  else if (t.id === "lg-q") { draft.q = t.value; const r = $("#lg-res"); if (r) r.innerHTML = pickRows(draft.foods, draft.q, draft.cat); }
  else if (t.id === "cu-q") { cu.q = t.value; cuRefresh(); }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "lg-und") { collectLog(); renderLog(true); }
  else if (t.dataset.rx) {
    collectLog();
    const id = t.dataset.rx;
    if (t.checked) { draft.x = id === "none" ? ["none"] : draft.x.filter(x => x !== "none").concat(id); } else draft.x = draft.x.filter(x => x !== id);
    renderLog(true);
  } else if (t.id === "photoin" && t.files[0]) {
    const fid = t.dataset.id;
    resizeImage(t.files[0], 192).then(url => { S.photos[fid] = url; if (save()) { openFood(fid); render(true); toast("Photo added"); } }, () => toast("Couldn’t read that image"));
  } else if (t.id === "importfile" && t.files[0]) {
    const rd = new FileReader(); rd.onload = () => importText(String(rd.result)); rd.readAsText(t.files[0]);
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheetOpen()) dismiss(); });
window.addEventListener("hashchange", route);
document.addEventListener("visibilitychange", () => { if (!document.hidden && !sheetOpen()) render(true); });

/* ───────── boot ───────── */
route();
if (!S.settings.onboarded && !S.baby.bday) openWelcome();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
