(() => {
'use strict';
/* ---------- helpers ---------- */
const LS_KEY = 'workoutLogger.v1';
const KG = 0.45359237;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const mondayOf = s => { const d = parseYmd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDate = s => { const d = parseYmd(s); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; };
const fmtShort = s => { const d = parseYmd(s); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const todayStr = () => ymd(new Date());
const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* ---------- plan ---------- */
function X(id, name, sets, reps, rpe, note, alts) { return { id, name, kind: 'sets', sets, reps, rpe: rpe || '', note: note || '', alts: alts || [] }; }
function T(id, name, note) { return { id, name, kind: 'text', sets: 0, reps: '', rpe: '', note: note || '', alts: [] }; }
const DAYS = [
  { id: 'D1', dow: 1, short: 'Mon', title: 'Lower Body Strength', sub: 'Squat emphasis' },
  { id: 'D2', dow: 2, short: 'Tue', title: 'Upper Body Strength', sub: '' },
  { id: 'D3', dow: 3, short: 'Wed', title: 'Olympic Lifting + Conditioning', sub: '' },
  { id: 'D4', dow: 4, short: 'Thu', title: 'Posterior Chain & Pull', sub: '' },
  { id: 'D5', dow: 5, short: 'Fri', title: 'Full-Body Power + Accessories', sub: '' },
];
const DEFAULT_PLAN = {
  D1: [
    X('d1a', 'Back Squat', 5, '5', '7-8'),
    X('d1b', 'Romanian Deadlift', 4, '8', ''),
    X('d1c', 'Bulgarian Split Squat', 3, '8-10', '', 'Per leg', ['Bulgarian Split Squat', 'Walking Lunge']),
    X('d1d', 'Leg Curl', 3, '10-12', '', '', ['Leg Curl', 'Nordic Curl']),
    X('d1e', 'Hanging Knee Raise', 3, '10-15', '', 'Core', ['Hanging Knee Raise', 'Ab Wheel Rollout']),
  ],
  D2: [
    X('d2a', 'Bench Press', 5, '5', ''),
    X('d2b', 'Weighted Pull-up', 4, '6-8', '', '', ['Weighted Pull-up', 'Lat Pulldown']),
    X('d2c', 'Overhead Press', 4, '6', ''),
    X('d2d', 'Chest-Supported Row', 3, '8-10', '', '', ['Chest-Supported Row', 'Seated Cable Row']),
    X('d2e', 'Lateral Raise', 3, '12-15', '', 'Shoulder health'),
    X('d2f', 'Face Pull', 3, '12-15', '', 'Shoulder health'),
  ],
  D3: [
    X('d3a', 'Power Clean', 6, '2-3', '', 'Technique focus', ['Power Clean', 'Hang Power Clean']),
    X('d3b', 'Power Snatch', 5, '2', '', 'Technique focus', ['Power Snatch', 'Hang Snatch']),
    X('d3c', 'Push Press', 3, '5', '', '', ['Push Press', 'Push Jerk', 'Split Jerk']),
    T('d3d', 'Conditioning', '10-15 min EMOM or short AMRAP: row/bike, KB swings, thrusters, burpees. Keep it sustainable.'),
  ],
  D4: [
    X('d4a', 'Deadlift', 4, '5', '', '', ['Deadlift', 'Trap Bar Deadlift']),
    X('d4b', 'Front Squat', 4, '6', ''),
    X('d4c', 'Barbell Bent-over Row', 4, '8', ''),
    X('d4d', 'Reverse Hyper', 3, '10-12', '', '', ['Reverse Hyper', 'Back Extension']),
    X('d4e', 'Pallof Press', 3, '', '', 'Core / carries. For carries log load + distance or time in Reps.', ['Pallof Press', "Farmer's Carry"]),
  ],
  D5: [
    X('d5a', 'Clean & Jerk', 5, '3-5', '', 'Or thruster complexes', ['Clean & Jerk', 'Thruster Complex']),
    X('d5b', 'Incline DB Press', 3, '8-10', '', 'Weight per dumbbell', ['Incline DB Press', 'DB Bench Press']),
    X('d5c', 'Single-arm DB Row', 3, '8', '', 'Per arm'),
    T('d5d', 'Accessory Circuit', '15-20 min: arms, rear delts, calves, mobility work.'),
    T('d5e', 'Finisher / Mobility (optional)', 'Optional light finisher or a longer mobility cooldown.'),
  ],
};

/* ---------- form tips (data-driven, matched by exercise name so saved plans/sessions get them too) ---------- */
const FORM_TIPS = {
  'bulgarian split squat': {
    'Setup': ['Rear foot elevated on bench, rear leg straight.', "Front leg bent \u2014 that's your start position.", 'Hold dumbbells next to your shins for balance.'],
    'Execution': ['Sit down into the rep under control.', 'Aim for ~90\u00b0 at the front knee.', 'Lean torso slightly forward to load the glutes.'],
    'Common mistakes': ['Front knee drifting past the toes.', 'Dumbbells held behind you or too far back.', 'Dropping into the rep instead of sitting down into it.'],
  },
};
// ex.formTips (custom, optional) overrides; otherwise looked up by name, so swapping to an alt shows only that alt's tips.
const tipsFor = ex => ex.formTips || FORM_TIPS[String(ex.name || '').trim().toLowerCase()] || null;
function tipsHtml(ex) {
  const t = tipsFor(ex); if (!t) return '';
  return `<details class="formtips"><summary>\u24d8 Form tips</summary>${Object.entries(t).map(([h, l]) => `<div class="ft-h">${esc(h)}</div><ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}</details>`;
}

/* ---------- state ---------- */
function defaults() { return { v: 1, units: 'lb', theme: 'auto', plan: clone(DEFAULT_PLAN), sessions: {}, checkins: {}, lastExport: null }; }
function load() {
  try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && s.v) return Object.assign(defaults(), s); } catch (e) { }
  return defaults();
}
let state = load();
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { toast('Could not save (storage blocked/full). Export a backup!'); } }
const dayForDate = s => { const d = parseYmd(s).getDay(); return d >= 1 && d <= 5 ? 'D' + d : 'D1'; };
const view = { tab: 'log', date: todayStr(), day: dayForDate(todayStr()), virtual: null, openHist: {}, progEx: null };
const dayInfo = id => DAYS.find(d => d.id === id);
const skey = (date, day) => `${date}|${day}`;

/* units */
const U = () => state.units;
const toDisp = lb => lb == null ? null : (U() === 'lb' ? lb : lb * KG);
const fromDisp = v => v == null ? null : (U() === 'lb' ? v : v / KG);
const fmtNum = n => n == null ? '' : String(Math.round(n * 10) / 10);
const dispW = lb => fmtNum(toDisp(lb));
const incr = () => U() === 'lb' ? 5 : 2.5;

/* ---------- sessions ---------- */
const blankSet = () => ({ w: null, r: null, rpe: '', done: false });
function makeSession(date, day) {
  return {
    date, day, ex: (state.plan[day] || []).map(e => {
      const x = clone(e);
      if (x.kind === 'text') Object.assign(x, { text: '', rounds: '', time: '', done: false });
      else x.data = Array.from({ length: x.sets }, blankSet);
      x.comment = '';
      return x;
    })
  };
}
function getSess() {
  const k = skey(view.date, view.day);
  if (state.sessions[k]) return state.sessions[k];
  if (!view.virtual || view.virtual.k !== k) view.virtual = { k, s: makeSession(view.date, view.day) };
  return view.virtual.s;
}
function touch() { const k = skey(view.date, view.day); state.sessions[k] = getSess(); view.virtual = null; save(); }
const doneSets = ex => (ex.data || []).filter(s => s.done);
function hasData(sess) {
  return sess.ex.some(e => e.kind === 'text' ? (e.text || e.rounds || e.time || e.done) : (doneSets(e).length || (e.data || []).some(s => s.w != null || s.r != null)));
}
const parseTop = reps => { const m = String(reps || '').match(/(\d+)\s*$/); return m ? +m[1] : null; };

function lastFor(name, beforeKey) {
  const n = norm(name); let best = null;
  for (const [k, s] of Object.entries(state.sessions)) {
    if (k === beforeKey || s.date > view.date) continue;
    for (const e of s.ex) if (e.kind !== 'text' && norm(e.name) === n && doneSets(e).length) {
      if (!best || s.date > best.date) best = { date: s.date, sets: e.data };
    }
  }
  return best;
}
const curKey = () => skey(view.date, view.day);
function fmtSet(s, withRpe = true) {
  const w = s.w != null ? dispW(s.w) : '—';
  return `${w}×${s.r != null ? s.r : '?'}${withRpe && s.rpe !== '' && s.rpe != null ? ' @' + s.rpe : ''}`;
}
function groupSets(sets, withRpe = true) {
  const out = []; let prev = null;
  for (const s of sets) {
    const t = fmtSet(s, withRpe);
    if (prev && prev.t === t) prev.n++; else out.push(prev = { t, n: 1 });
  }
  return out.map(g => g.n > 1 ? `${g.t} (×${g.n})` : g.t).join(', ');
}
function topSet(sets) {
  let best = null;
  for (const s of sets) if (s.done && s.w > 0 && (!best || s.w > best.w || (s.w === best.w && (s.r || 0) > (best.r || 0)))) best = s;
  return best;
}
function progSuggestion(ex, sets, label) {
  if (ex.kind === 'text') return null;
  const top = parseTop(ex.reps); if (!top) return null;
  const done = sets.filter(s => s.done); if (!done.length || done.length < ex.sets) return null;
  if (!done.every(s => s.w > 0 && s.r >= top)) return null;
  const mx = Math.max(...done.map(s => s.w));
  const base = toDisp(mx);
  return { label, top, n: done.length, at: fmtNum(base), text: `${label} hit ${top}+ reps on all ${done.length} sets at ${fmtNum(base)} ${U()}`, next: fmtNum(base + incr()) };
}

/* ---------- toast ---------- */
let tt; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }

/* ---------- header ---------- */
function renderHeader() {
  const t = todayStr();
  $('#dateLabel').textContent = (view.date === t ? 'Today · ' : '') + fmtDate(view.date);
  $('#dateInput').value = view.date;
  $('#dayTabs').innerHTML = DAYS.map(d => {
    const s = state.sessions[skey(view.date, d.id)];
    return `<button data-day="${d.id}" class="${view.day === d.id ? 'on' : ''} ${s && hasData(s) ? 'dot' : ''}">${d.short}<small>D${d.id.slice(1)}</small></button>`;
  }).join('');
  $('#top').style.display = (view.tab === 'log') ? '' : 'none';
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === view.tab));
}

/* ---------- log view ---------- */
/* Garmin-style daily check-in. Stored per date in state.checkins[date]:
   sleepScore, battery, readiness (0-100), sleep (hrs), rhr (bpm), hrv (ms), notes, and legacy energy (1-5, kept for old entries). */
const bandOf = (n, cuts, names) => { for (let i = 0; i < cuts.length; i++) if (n <= cuts[i]) return i; return names.length - 1; };
const CI_FIELDS = [
  { k: 'sleepScore', label: 'Sleep score', min: 0, max: 100, int: true, mode: 'numeric', ph: '0–100', hint: 'Garmin: last night’s sleep score',
    names: ['Poor', 'Fair', 'Good', 'Excellent'], cuts: [59, 79, 89] },
  { k: 'battery', label: 'Body Battery', min: 0, max: 100, int: true, mode: 'numeric', ph: '0–100', hint: 'Garmin: value when you woke up',
    names: ['Low', 'Medium', 'High', 'Very high'], cuts: [25, 50, 75] },
  { k: 'readiness', label: 'Training Readiness', min: 0, max: 100, int: true, mode: 'numeric', ph: '0–100', hint: 'Garmin: morning score',
    names: ['Poor', 'Low', 'Moderate', 'High', 'Prime'], cuts: [25, 50, 75, 95] },
  { k: 'sleep', label: 'Sleep (hrs)', min: 0, max: 24, int: false, mode: 'decimal', ph: 'optional, e.g. 7.5', opt: true },
  { k: 'rhr', label: 'Resting HR', min: 20, max: 220, int: true, mode: 'numeric', ph: 'optional, bpm', opt: true },
  { k: 'hrv', label: 'HRV (ms)', min: 1, max: 300, int: true, mode: 'numeric', ph: 'optional, overnight avg ms', opt: true },
];
const CI_BY_KEY = Object.fromEntries(CI_FIELDS.map(f => [f.k, f]));
const bandInfo = (k, v) => { const f = CI_BY_KEY[k]; const n = num(v); if (!f || !f.names || n == null) return null; const i = bandOf(n, f.cuts, f.names); return { name: f.names[i], i, n: f.names.length }; };
const bandHtml = (k, v) => { const b = bandInfo(k, v); return b ? `<span class="band b${b.i} of${b.n}">${b.name}</span>` : ''; };
function parseCi(f, raw) { // -> {ok, v} ; empty is valid (null)
  const t = String(raw).trim().replace(',', '.');
  if (t === '') return { ok: true, v: null };
  if (!/^\d+(\.\d+)?$/.test(t) || (f.int && t.includes('.'))) return { ok: false, msg: f.int ? 'Whole number only' : 'Numbers only' };
  const n = Number(t);
  if (n < f.min || n > f.max) return { ok: false, msg: `Enter ${f.min}–${f.max}` };
  return { ok: true, v: n };
}
const hasCheckin = c => !!c && (CI_FIELDS.some(f => c[f.k] != null && c[f.k] !== '') || c.energy || c.notes);
function checkinHtml() {
  const c = state.checkins[view.date] || {};
  const row = f => `<div class="grid"><label class="mute" for="ci-${f.k}">${f.label}${f.opt ? '' : ''}</label>
    <div><div class="cirow"><input id="ci-${f.k}" data-ci="${f.k}" type="text" inputmode="${f.mode}" autocomplete="off" enterkeyhint="done" placeholder="${f.ph}" value="${esc(c[f.k] ?? '')}"><span class="bandslot" id="band-${f.k}">${bandHtml(f.k, c[f.k])}</span></div>
    ${f.hint ? `<div class="small mute cihint">${f.hint}</div>` : ''}<div class="small cierr" id="err-${f.k}"></div></div></div>`;
  const legacy = c.energy ? `<div class="grid"><span class="mute">Energy (old 1–5)</span><div class="energy" id="ci-energy">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" class="${c.energy === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>` : '';
  return `<div class="card checkin"><h3>Daily check-in <span class="mute small">· from Garmin</span></h3>
  ${CI_FIELDS.map(row).join('')}${legacy}
  <div class="grid"><label class="mute" for="ci-notes">Notes</label><input id="ci-notes" placeholder="Soreness, stress, mood…" value="${esc(c.notes || '')}"></div></div>`;
}
const bandTxt = (k, v) => { const b = bandInfo(k, v); return b ? ` (${b.name})` : ''; };
function ciParts(c, long) { // compact list of metrics for history / summary
  const o = [];
  const S = (k, short, long_, unit) => { if (c[k] != null && c[k] !== '') o.push(long ? `${long_} ${c[k]}${unit || ''}${bandTxt(k, c[k])}` : `${short} ${c[k]}${unit || ''}`); };
  S('sleepScore', '😴', 'sleep score'); S('battery', '🔋', 'Body Battery'); S('readiness', '🎯', 'Training Readiness');
  if (c.sleep != null && c.sleep !== '') o.push(long ? `sleep ${c.sleep}h` : `🛏 ${c.sleep}h`);
  S('rhr', '❤️', 'resting HR', ' bpm'); S('hrv', 'HRV', 'HRV', ' ms');
  if (c.energy) o.push(long ? `energy/recovery ${c.energy}/5 (old rating)` : `⚡ ${c.energy}/5`);
  return o;
}
function ciAverages(dates) { // [{label, avg, n, unit}]
  const defs = [['sleepScore', 'Sleep score', ''], ['battery', 'Body Battery', ''], ['readiness', 'Training Readiness', ''], ['sleep', 'Sleep hours', 'h'], ['rhr', 'Resting HR', ' bpm'], ['hrv', 'HRV', ' ms'], ['energy', 'Energy (old 1-5 rating)', '/5']];
  const out = [];
  for (const [k, label, unit] of defs) {
    const v = dates.map(d => state.checkins[d]).filter(Boolean).map(c => num(c[k])).filter(x => x != null && x > 0);
    if (v.length) out.push({ k, label, unit, n: v.length, avg: v.reduce((a, b) => a + b, 0) / v.length });
  }
  return out;
}
function hintHtml(ex) {
  if (ex.kind === 'text') return '';
  const last = lastFor(ex.name, curKey());
  if (!last) return '<span>No previous session logged for this exercise.</span>';
  const sets = last.sets.filter(s => s.done);
  return `Last (${fmtDate(last.date)}): <b>${esc(groupSets(sets))}</b> ${U()}`;
}
function progHtml(ex) {
  if (ex.kind === 'text') return '';
  const cur = progSuggestion(ex, ex.data, 'You');
  if (cur) return `✅ ${esc(cur.text)}. Add weight next time → ${esc(cur.next)} ${U()}`;
  const last = lastFor(ex.name, curKey());
  if (last) {
    const p = progSuggestion(ex, last.sets, 'Last time you');
    if (p) return `⬆️ ${esc(p.text)}. Try ${esc(p.next)} ${U()} today`;
  }
  return '';
}
function setRowHtml(ex, s, i, last) {
  const ls = last && (last.sets.filter(x => x.done)[i] || last.sets.filter(x => x.done).slice(-1)[0]);
  const wph = ls && ls.w != null ? dispW(ls.w) : '';
  const rph = ls && ls.r != null ? ls.r : (parseTop(ex.reps) || '');
  return `<div class="set ${s.done ? 'done' : ''}" data-e="${ex.id}" data-i="${i}">
    <span class="n">${i + 1}</span>
    <input data-f="w" inputmode="decimal" enterkeyhint="next" placeholder="${wph}" value="${s.w != null ? dispW(s.w) : ''}" aria-label="Set ${i + 1} weight">
    <input data-f="r" inputmode="numeric" enterkeyhint="next" placeholder="${rph}" value="${s.r != null ? s.r : ''}" aria-label="Set ${i + 1} reps">
    <input data-f="rpe" inputmode="decimal" enterkeyhint="done" placeholder="${esc(ex.rpe ? ex.rpe.split('-')[0] : '')}" value="${esc(s.rpe)}" aria-label="Set ${i + 1} RPE">
    <button class="chk" data-act="chk" aria-label="Mark set ${i + 1} done">✓</button></div>`;
}
function cardHtml(ex) {
  const meta = ex.kind === 'text' ? esc(ex.note) :
    `${ex.sets} × ${esc(ex.reps || '—')}${ex.rpe ? ' · RPE ' + esc(ex.rpe) : ''}${ex.note ? ' · ' + esc(ex.note) : ''}`;
  let body;
  if (ex.kind === 'text') {
    body = `<div class="textfields" data-e="${ex.id}">
      <div><label>What you did (format, movements, loads)</label><textarea data-tf="text" placeholder="e.g. EMOM 12: row 12 cal / 10 KB swings / 6 thrusters">${esc(ex.text)}</textarea></div>
      <div class="two"><div><label>Rounds / score</label><input data-tf="rounds" value="${esc(ex.rounds)}" placeholder="e.g. 8 rounds"></div>
      <div><label>Time (min)</label><input data-tf="time" inputmode="decimal" value="${esc(ex.time)}" placeholder="e.g. 12"></div></div>
      <button class="btn donebtn ${ex.done ? 'on' : ''}" data-act="textdone" data-e="${ex.id}">${ex.done ? '✓ Done' : 'Mark done'}</button></div>`;
  } else {
    const last = lastFor(ex.name, curKey());
    body = `<div class="hint" data-r="hint">${hintHtml(ex)}</div>
      <div class="sets"><div class="set hdr"><span>#</span><span>${U()}</span><span>Reps</span><span>RPE</span><span></span></div>
      ${ex.data.map((s, i) => setRowHtml(ex, s, i, last)).join('')}</div>
      <div class="prog" data-r="prog">${progHtml(ex)}</div>
      <div class="ex-actions"><button class="btn sm" data-act="addset" data-e="${ex.id}">+ Set</button>
      <button class="btn sm" data-act="rmset" data-e="${ex.id}">− Set</button>
      ${last ? `<button class="btn sm" data-act="copylast" data-e="${ex.id}">Copy last</button>` : ''}</div>
      <div class="ex-note"><input data-cf="comment" data-e="${ex.id}" placeholder="Notes (cues, how it felt)…" value="${esc(ex.comment)}"></div>`;
  }
  return `<section class="card ex ${isComplete(ex) ? 'complete' : ''}" id="ex-${ex.id}">
    <div class="ex-head"><div><h3>${esc(ex.name)}</h3><div class="meta">${meta}</div></div>
    <div class="row"><span class="count" data-r="count">${countText(ex)}</span><button class="btn sm" data-act="edit" data-e="${ex.id}" aria-label="Edit exercise">⋯</button></div></div>${tipsHtml(ex)}${body}</section>`;
}
const isComplete = ex => ex.kind === 'text' ? !!ex.done : (doneSets(ex).length >= ex.sets && ex.sets > 0);
const countText = ex => ex.kind === 'text' ? (ex.done ? '✓' : '') : `${doneSets(ex).length}/${ex.sets}`;

function renderLog() {
  const sess = getSess(); const di = dayInfo(view.day);
  const wk = parseYmd(view.date).getDay();
  let h = '';
  if (wk === 0 || wk === 6) h += `<div class="banner">${DOW[wk]} is a rest / active-recovery day. Showing ${di.short}'s plan (next up). Pick a day above to log a make-up session.</div>`;
  else if (view.day !== 'D' + wk) h += `<div class="banner">Showing ${di.short}'s session on ${fmtDate(view.date)} (usual day: ${DOW[wk]}).</div>`;
  h += `<h2>${esc(di.title)}${di.sub ? ` <span class="mute small">· ${esc(di.sub)}</span>` : ''}</h2>`;
  h += checkinHtml();
  h += sess.ex.map(cardHtml).join('');
  h += `<div class="row"><button class="btn block" data-act="addex">+ Add exercise</button></div>
        <button class="btn primary block" data-act="summary">Export weekly summary</button>`;
  $('#view').innerHTML = h;
}
function refreshCard(id) {
  const ex = getSess().ex.find(e => e.id === id); if (!ex) return;
  const card = $('#ex-' + id); if (!card) return;
  card.classList.toggle('complete', isComplete(ex));
  $('[data-r=count]', card).textContent = countText(ex);
  if (ex.kind === 'text') { const b = $('.donebtn', card); b.classList.toggle('on', !!ex.done); b.textContent = ex.done ? '✓ Done' : 'Mark done'; return; }
  $('[data-r=hint]', card).innerHTML = hintHtml(ex);
  const p = $('[data-r=prog]', card); const html = progHtml(ex); p.innerHTML = html; p.classList.toggle('ok', html.startsWith('✅'));
  $$('.set[data-i]', card).forEach(row => {
    const s = ex.data[+row.dataset.i]; row.classList.toggle('done', s.done);
    for (const inp of $$('input', row)) {
      if (document.activeElement === inp) continue;
      const f = inp.dataset.f; inp.value = f === 'w' ? (s.w != null ? dispW(s.w) : '') : f === 'r' ? (s.r != null ? s.r : '') : s.rpe;
    }
  });
}

/* ---------- history ---------- */
function sessionLines(s) {
  return s.ex.map(e => {
    if (e.kind === 'text') {
      if (!(e.text || e.rounds || e.time || e.done)) return null;
      const bits = [e.text, e.rounds && `rounds/score: ${e.rounds}`, e.time && `${e.time} min`].filter(Boolean).join(' — ');
      return `${e.name}: ${bits || 'done'}`;
    }
    const d = doneSets(e); if (!d.length) return null;
    return `${e.name}${d.length < e.sets ? ` (${d.length}/${e.sets} sets)` : ''}: ${groupSets(d)}${e.comment ? ' — ' + e.comment : ''}`;
  }).filter(Boolean);
}
function renderHistory() {
  const dates = new Set();
  for (const s of Object.values(state.sessions)) if (hasData(s)) dates.add(s.date);
  for (const [d, c] of Object.entries(state.checkins)) if (hasCheckin(c)) dates.add(d);
  const list = [...dates].sort().reverse();
  if (!list.length) { $('#view').innerHTML = '<h2>History</h2><div class="empty">No workouts logged yet.<br>Log a set and it will show up here.</div>'; return; }
  let h = '<h2>History</h2>';
  for (const d of list) {
    const sess = Object.values(state.sessions).filter(s => s.date === d && hasData(s));
    const c = state.checkins[d];
    const ci = c ? [...ciParts(c, false), c.notes].filter(Boolean).join(' · ') : '';
    h += `<div class="card hist-item"><div class="top"><div><h3>${fmtDate(d)}</h3>${ci ? `<div class="small mute">${esc(ci)}</div>` : ''}</div></div>`;
    for (const s of sess) {
      const di = dayInfo(s.day);
      h += `<div style="margin-top:8px"><b>${di.short} · ${esc(di.title)}</b><ul>${sessionLines(s).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="openhist" data-date="${d}" data-day="${s.day}">Open / edit</button>
      <button class="btn sm danger" data-act="delhist" data-date="${d}" data-day="${s.day}">Delete</button></div></div>`;
    }
    if (!sess.length) h += `<div class="row" style="margin-top:8px"><button class="btn sm" data-act="openhist" data-date="${d}" data-day="${dayForDate(d)}">Open day</button></div>`;
    h += '</div>';
  }
  $('#view').innerHTML = h;
}

/* ---------- progress ---------- */
function exerciseNames() {
  const cnt = {};
  for (const s of Object.values(state.sessions)) for (const e of s.ex) if (e.kind !== 'text' && doneSets(e).length) { const k = norm(e.name); cnt[k] = cnt[k] || { name: e.name, n: 0 }; cnt[k].n++; cnt[k].name = e.name; }
  return Object.values(cnt).sort((a, b) => a.name.localeCompare(b.name));
}
function series(name) {
  const n = norm(name); const byDate = {};
  for (const s of Object.values(state.sessions)) for (const e of s.ex) if (e.kind !== 'text' && norm(e.name) === n) {
    const d = doneSets(e); if (!d.length) continue;
    const t = topSet(e.data);
    const o = byDate[s.date] || (byDate[s.date] = { date: s.date, w: null, r: 0, maxReps: 0, vol: 0 });
    if (t && (o.w == null || t.w > o.w)) { o.w = t.w; o.r = t.r || 0; }
    for (const x of d) { o.maxReps = Math.max(o.maxReps, x.r || 0); o.vol += (x.w || 0) * (x.r || 0); }
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}
function chartSvg(pts, label, clamp) {
  const W = 340, H = 190, L = 38, R = 12, T = 14, B = 26;
  const vals = pts.map(p => p.v); let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const padv = (hi - lo) * 0.15; lo -= padv; hi += padv;
  if (clamp) { lo = Math.max(lo, clamp[0]); hi = Math.min(hi, clamp[1]); }
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (pts.length - 1);
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  let g = '';
  for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${fmtNum(v)}</text>`; }
  const line = pts.length > 1 ? `<polyline class="line" points="${pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')}"/>` : '';
  const dots = pts.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.v)}" r="4.5"><title>${fmtShort(p.date)}: ${fmtNum(p.v)}</title></circle>`).join('');
  const xl = `<text x="${x(0)}" y="${H - 8}" text-anchor="${pts.length > 1 ? 'start' : 'middle'}">${fmtShort(pts[0].date)}</text>` +
    (pts.length > 1 ? `<text x="${x(pts.length - 1)}" y="${H - 8}" text-anchor="end">${fmtShort(pts[pts.length - 1].date)}</text>` : '');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} over time">${g}${line}${dots}${xl}</svg>`;
}
function recoveryCard() {
  const dates = Object.keys(state.checkins).sort();
  const metrics = CI_FIELDS.map(f => ({ k: f.k, label: f.label.replace(' (hrs)', ' hours').replace(' (ms)', '') })).concat([{ k: 'energy', label: 'Energy (old 1–5)' }]);
  const has = k => dates.some(d => num((state.checkins[d] || {})[k]) != null);
  const avail = metrics.filter(m => has(m.k));
  if (!avail.length) return '';
  if (!avail.some(m => m.k === view.recMetric)) view.recMetric = avail[0].k;
  const pts = dates.map(d => ({ date: d, v: num((state.checkins[d] || {})[view.recMetric]) })).filter(p => p.v != null).slice(-30);
  const lab = avail.find(m => m.k === view.recMetric).label;
  const vals = pts.map(p => p.v), avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const f = (v) => fmtNum(v);
  let h = `<div class="card"><h3 style="margin-bottom:8px">Recovery trends</h3><select id="recSel">${avail.map(m => `<option value="${m.k}" ${m.k === view.recMetric ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select>
  <div class="stats"><div class="stat"><b>${f(avg)}</b><span>Average</span></div><div class="stat"><b>${f(vals[vals.length - 1])}</b><span>Latest</span></div><div class="stat"><b>${f(Math.min(...vals))}–${f(Math.max(...vals))}</b><span>Range</span></div></div>
  <div class="small mute" style="margin-bottom:4px">${esc(lab)} by day (last ${pts.length} entr${pts.length === 1 ? 'y' : 'ies'})${bandInfo(view.recMetric, avg) ? ` · average is ${bandInfo(view.recMetric, avg).name}` : ''}</div>${chartSvg(pts, lab, CI_BY_KEY[view.recMetric] && CI_BY_KEY[view.recMetric].max === 100 ? [0, 100] : view.recMetric === 'energy' ? [1, 5] : [0, 1e9])}</div>`;
  return h;
}
function renderProgress() {
  const names = exerciseNames(); const rec = recoveryCard();
  if (!names.length) { $('#view').innerHTML = '<h2>Progress</h2>' + rec + (rec ? '' : '<div class="empty">Check off some sets and your top-set progress will chart here.</div>'); return; }
  if (!view.progEx || !names.some(n => norm(n.name) === norm(view.progEx))) {
    const todays = getSess().ex.find(e => names.some(n => norm(n.name) === norm(e.name)));
    view.progEx = todays ? todays.name : names[0].name;
  }
  const ser = series(view.progEx);
  const useW = ser.some(p => p.w != null);
  const pts = ser.map(p => ({ date: p.date, v: useW ? toDisp(p.w) : p.maxReps, r: p.r })).filter(p => p.v != null);
  const unit = useW ? U() : 'reps';
  let h = `<h2>Progress</h2><div class="card"><select id="progSel">${names.map(n => `<option ${norm(n.name) === norm(view.progEx) ? 'selected' : ''}>${esc(n.name)}</option>`).join('')}</select>`;
  if (pts.length) {
    const first = pts[0].v, lastv = pts[pts.length - 1].v, best = Math.max(...pts.map(p => p.v));
    h += `<div class="stats"><div class="stat"><b>${fmtNum(best)}</b><span>Best ${unit}</span></div><div class="stat"><b>${fmtNum(lastv)}</b><span>Latest</span></div><div class="stat"><b>${lastv - first >= 0 ? '+' : ''}${fmtNum(lastv - first)}</b><span>Change</span></div></div>`;
    h += `<div class="small mute" style="margin-bottom:4px">${useW ? 'Top-set weight' : 'Best reps in a set'} per session (${unit})</div>${chartSvg(pts, view.progEx)}`;
    h += `<table class="ptable"><tr><th>Date</th><th>${useW ? 'Top set' : 'Best reps'}</th></tr>${[...pts].reverse().slice(0, 15).map(p => `<tr><td>${fmtDate(p.date)}</td><td>${fmtNum(p.v)}${useW ? ` ${unit} × ${p.r || '?'}` : ''}</td></tr>`).join('')}</table>`;
  }
  h += '</div>' + rec;
  $('#view').innerHTML = h;
}

/* ---------- more ---------- */
function renderMore() {
  const last = state.lastExport; const days = last ? Math.floor((Date.now() - last) / 864e5) : null;
  const n = Object.values(state.sessions).filter(hasData).length;
  $('#view').innerHTML = `<h2>More</h2>
  <div class="card"><h3>Weight units</h3><div class="seg" id="unitSeg" style="margin-top:8px"><button data-u="lb" class="${U() === 'lb' ? 'on' : ''}">lb</button><button data-u="kg" class="${U() === 'kg' ? 'on' : ''}">kg</button></div>
  <div class="small mute" style="margin-top:6px">Switching just changes how weights are shown; nothing is lost.</div></div>
  <div class="card"><h3>Theme</h3><div class="seg" id="themeSeg" style="margin-top:8px">${['auto', 'dark', 'light'].map(t => `<button data-t="${t}" class="${state.theme === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
  <div class="card"><h3>Weekly summary</h3><div class="small mute">A text recap you can paste into chat with your fitness assistant.</div>
  <button class="btn primary block" data-act="summary">Export summary</button></div>
  <div class="card"><h3>Backup</h3><div class="small mute">Everything lives only in this browser on this device (${n} logged session${n === 1 ? '' : 's'}). ${last ? `Last backup: ${days === 0 ? 'today' : days + ' day(s) ago'}.` : '<b>No backup yet.</b>'} Export now and then, especially before clearing browser data or switching phones.</div>
  <button class="btn block" data-act="exportjson">Export backup (JSON)</button>
  <button class="btn block" data-act="copyjson">Copy backup as text</button>
  <button class="btn block" data-act="importjson">Import backup (file)…</button>
  <button class="btn block" data-act="importtext">Import backup (paste text)…</button>
  <input type="file" id="fileIn" accept="application/json,.json" hidden></div>
  <div class="card"><h3>Plan</h3><div class="small mute">Tap “⋯” on any exercise to swap the variation, change sets/reps or remove it. Use “+ Add exercise” at the bottom of a day to add one.</div>
  <button class="btn danger block" data-act="resetplan">Reset plan to default</button></div>
  <div class="card"><h3>Install</h3><div class="small mute">iPhone: Share → Add to Home Screen. Android/Chrome: menu → Install app / Add to Home screen. Works offline once loaded.</div></div>`;
}

/* ---------- summary ---------- */
function weekSummary(mon) {
  const sun = addDays(mon, 6);
  const lines = [`WEEKLY WORKOUT SUMMARY — ${fmtShort(mon)} to ${fmtShort(sun)}, ${parseYmd(sun).getFullYear()} (units: ${U()})`];
  const sessions = Object.values(state.sessions).filter(s => s.date >= mon && s.date <= sun && hasData(s)).sort((a, b) => a.date.localeCompare(b.date) || a.day.localeCompare(b.day));
  let totalSets = 0; const flags = []; const checks = []; const ciDates = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i); const ss = sessions.filter(s => s.date === d); const c = state.checkins[d];
    if (hasCheckin(c)) { checks.push(`${DOW[parseYmd(d).getDay()]}: ${[...ciParts(c, true), c.notes && `"${c.notes}"`].filter(Boolean).join(', ')}`); ciDates.push(d); }
    for (const s of ss) {
      const di = dayInfo(s.day);
      lines.push('', `${DOW[parseYmd(d).getDay()]} ${fmtShort(d)} — D${s.day.slice(1)} ${di.title}`);
      for (const e of s.ex) {
        if (e.kind === 'text') {
          if (!(e.text || e.rounds || e.time || e.done)) continue;
          lines.push(`  • ${e.name}: ${[e.text, e.rounds && `rounds/score ${e.rounds}`, e.time && `${e.time} min`].filter(Boolean).join(' | ') || 'done'}`);
          continue;
        }
        const dn = doneSets(e); if (!dn.length) continue;
        totalSets += dn.length;
        lines.push(`  • ${e.name} (${e.sets}×${e.reps || '—'}${e.rpe ? ' @' + e.rpe : ''}): ${groupSets(dn)}${dn.length < e.sets ? `  [${dn.length}/${e.sets} sets]` : ''}${e.comment ? `  — ${e.comment}` : ''}`);
        const p = progSuggestion(e, e.data, 'x'); if (p) flags.push(`${e.name}: all ${p.n} sets hit ${p.top}+ reps at ${p.at} ${U()} → add weight, try ${p.next} ${U()} next time`);
      }
    }
  }
  const missed = []; for (let i = 0; i < 5; i++) { const d = addDays(mon, i); if (d <= todayStr() && !sessions.some(s => s.date === d)) missed.push(DOW[parseYmd(d).getDay()]); }
  lines.push('', `TOTALS: ${sessions.length} session(s), ${totalSets} sets completed${missed.length ? `; no session logged: ${missed.join(', ')}` : ''}`);
  if (checks.length) {
    lines.push('', 'CHECK-INS (Garmin: sleep score / Body Battery at wake / Training Readiness):'); checks.forEach(c => lines.push('  ' + c));
    const av = ciAverages(ciDates);
    if (av.length) { lines.push('', `WEEKLY GARMIN AVERAGES (over days logged, ${ciDates.length} check-in day${ciDates.length === 1 ? '' : 's'}):`);
      av.forEach(a => { const r = a.k === 'sleep' || a.k === 'energy' ? Math.round(a.avg * 10) / 10 : Math.round(a.avg); lines.push(`  • ${a.label}: ${r}${a.unit}${bandTxt(a.k, a.avg)} (${a.n} day${a.n === 1 ? '' : 's'})`); }); }
  }
  if (flags.length) { lines.push('', 'PROGRESSION FLAGS:'); flags.forEach(f => lines.push('  • ' + f)); }
  if (!sessions.length) lines.push('', '(Nothing logged this week yet.)');
  return lines.join('\n');
}
function openSummary(mon) {
  mon = mon || mondayOf(view.date);
  openDlg(`<h3>Weekly summary</h3>
  <div class="row" style="margin-bottom:8px"><button class="icon-btn" data-act="wk" data-d="-7">‹</button><div style="flex:1;text-align:center;font-weight:700">Week of ${fmtShort(mon)}</div><button class="icon-btn" data-act="wk" data-d="7">›</button></div>
  <textarea class="summary" id="sumText" readonly>${esc(weekSummary(mon))}</textarea>
  <div class="dlg-actions"><button class="btn primary" data-act="copysum">Copy</button><button class="btn" data-act="closedlg">Close</button></div>`);
  $('#dlg').dataset.mon = mon;
}

/* ---------- dialogs ---------- */
function openDlg(html) { const d = $('#dlg'); d.innerHTML = html; if (!d.open) d.showModal(); }
function closeDlg() { const d = $('#dlg'); if (d.open) d.close(); }
function editDialog(id) {
  const adding = !id;
  const ex = adding ? { id: '', name: '', kind: 'sets', sets: 3, reps: '8-10', rpe: '', note: '', alts: [] } : getSess().ex.find(e => e.id === id);
  openDlg(`<h3>${adding ? 'Add exercise' : 'Edit exercise'}</h3>
  <label class="f">Name</label><input id="ed-name" value="${esc(ex.name)}" placeholder="Exercise name">
  ${ex.alts && ex.alts.length ? `<div class="small mute" style="margin-top:6px">Swap to:</div><div class="chips">${ex.alts.map(a => `<button class="chip" data-act="alt" data-name="${esc(a)}">${esc(a)}</button>`).join('')}</div>` : ''}
  ${adding ? `<label class="f">Type</label><div class="seg" id="ed-kind"><button data-k="sets" class="on">Sets (weight × reps)</button><button data-k="text">Free text</button></div>` : ''}
  <div id="ed-setsbox" ${ex.kind === 'text' ? 'hidden' : ''}>
  <div class="row"><div style="flex:1"><label class="f">Sets</label><input id="ed-sets" inputmode="numeric" value="${ex.sets}"></div>
  <div style="flex:1"><label class="f">Reps (e.g. 8-10)</label><input id="ed-reps" value="${esc(ex.reps)}"></div>
  <div style="flex:1"><label class="f">RPE</label><input id="ed-rpe" value="${esc(ex.rpe)}"></div></div></div>
  <label class="f">Note / description</label><input id="ed-note" value="${esc(ex.note)}" placeholder="e.g. per leg, tempo, cues">
  <div class="small mute" style="margin-top:8px">${adding ? 'Added to this day of your plan from now on.' : 'Changes apply to this session and future ones for this day. Past history keeps its original names.'}</div>
  <div class="dlg-actions">${adding ? '' : '<button class="btn danger" data-act="rmex">Remove</button>'}<button class="btn" data-act="closedlg">Cancel</button><button class="btn primary" data-act="saveex">Save</button></div>`);
  $('#dlg').dataset.e = id || ''; $('#dlg').dataset.kind = ex.kind;
}
function saveEdit() {
  const d = $('#dlg'); const id = d.dataset.e;
  const name = $('#ed-name').value.trim(); if (!name) { toast('Give it a name'); return; }
  const kind = d.dataset.kind;
  const f = { name, kind, sets: kind === 'text' ? 0 : Math.max(1, Math.min(20, parseInt($('#ed-sets').value) || 3)), reps: kind === 'text' ? '' : $('#ed-reps').value.trim(), rpe: kind === 'text' ? '' : $('#ed-rpe').value.trim(), note: $('#ed-note').value.trim() };
  const plan = state.plan[view.day];
  if (!id) {
    const ex = Object.assign({ id: 'x' + Date.now().toString(36), alts: [] }, f); plan.push(ex);
    const s = getSess(); const sx = clone(ex);
    if (kind === 'text') Object.assign(sx, { text: '', rounds: '', time: '', done: false }); else sx.data = Array.from({ length: sx.sets }, blankSet);
    sx.comment = ''; s.ex.push(sx); touch();
  } else {
    const p = plan.find(e => e.id === id); if (p) Object.assign(p, f);
    const sx = getSess().ex.find(e => e.id === id);
    if (sx) {
      Object.assign(sx, f);
      if (sx.kind !== 'text') { while (sx.data.length < sx.sets) sx.data.push(blankSet()); while (sx.data.length > sx.sets && !sx.data[sx.data.length - 1].done && sx.data[sx.data.length - 1].w == null && sx.data[sx.data.length - 1].r == null) sx.data.pop(); }
      touch();
    }
    save();
  }
  closeDlg(); render();
}
function removeEx() {
  const id = $('#dlg').dataset.e;
  const sx = getSess().ex.find(e => e.id === id);
  const logged = sx && (sx.kind === 'text' ? (sx.text || sx.rounds || sx.time) : doneSets(sx).length);
  if (!confirm(logged ? 'Remove this exercise? Today\'s logged data for it will be deleted.' : 'Remove this exercise from the plan?')) return;
  state.plan[view.day] = state.plan[view.day].filter(e => e.id !== id);
  const s = getSess(); s.ex = s.ex.filter(e => e.id !== id); touch(); closeDlg(); render();
}

/* ---------- backup ---------- */
function backupJson() { return JSON.stringify({ app: 'workout-logger', exported: new Date().toISOString(), ...state }, null, 2); }
async function exportJson() {
  const text = backupJson(); const name = `workout-logger-backup-${todayStr()}.json`;
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); state.lastExport = Date.now(); save(); renderMore(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  state.lastExport = Date.now(); save(); toast('Backup downloaded'); renderMore();
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) { }
  const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); return ok;
}
function importData(text) {
  let o; try { o = JSON.parse(text); } catch (e) { toast('That is not valid JSON'); return false; }
  if (!o || typeof o !== 'object' || !o.sessions || !o.plan) { toast('Not a Workout Log backup'); return false; }
  const n = Object.keys(o.sessions).length;
  if (!confirm(`Replace ALL current data with this backup (${n} sessions)?`)) return false;
  state = Object.assign(defaults(), { units: o.units || 'lb', theme: o.theme || 'auto', plan: o.plan, sessions: o.sessions, checkins: o.checkins || {}, lastExport: o.lastExport || null });
  save(); applyTheme(); view.virtual = null; toast('Backup restored'); render(); return true;
}
function applyTheme() { if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', state.theme); }

/* ---------- render ---------- */
function render() {
  renderHeader();
  ({ log: renderLog, history: renderHistory, progress: renderProgress, more: renderMore })[view.tab]();
}
function go(date, day) { view.date = date; view.day = day || dayForDate(date); view.virtual = null; render(); }

/* ---------- events ---------- */
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.tab = b.dataset.tab; render(); window.scrollTo(0, 0); });
$('#prevDate').onclick = () => go(addDays(view.date, -1));
$('#nextDate').onclick = () => go(addDays(view.date, 1));
$('#dateInput').onchange = e => { if (e.target.value) go(e.target.value); };
$('#dayTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view.day = b.dataset.day; view.virtual = null; render(); });

const view$ = $('#view');
view$.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.ci) {
    const f = CI_BY_KEY[t.dataset.ci]; const r = parseCi(f, t.value); const err = $('#err-' + f.k);
    t.classList.toggle('bad', !r.ok); if (err) err.textContent = r.ok ? '' : r.msg;
    if (!r.ok) { const slot = $('#band-' + f.k); if (slot) slot.innerHTML = ''; return; } // invalid: don't store
    const c = state.checkins[view.date] = state.checkins[view.date] || {};
    c[f.k] = r.v; save(); const slot = $('#band-' + f.k); if (slot) slot.innerHTML = bandHtml(f.k, r.v); return;
  }
  if (t.id === 'ci-notes') { const c = state.checkins[view.date] = state.checkins[view.date] || {}; c.notes = t.value; save(); return; }
  if (t.id === 'progSel' || t.id === 'recSel') return;
  const row = t.closest('.set[data-e]');
  if (row && t.dataset.f) {
    const ex = getSess().ex.find(x => x.id === row.dataset.e); const s = ex.data[+row.dataset.i];
    const f = t.dataset.f;
    if (f === 'w') s.w = fromDisp(num(t.value)); else if (f === 'r') s.r = num(t.value) == null ? null : Math.round(num(t.value)); else s.rpe = t.value.trim();
    touch(); return;
  }
  if (t.dataset.tf) { const ex = getSess().ex.find(x => x.id === t.closest('[data-e]').dataset.e); ex[t.dataset.tf] = t.value; touch(); return; }
  if (t.dataset.cf) { const ex = getSess().ex.find(x => x.id === t.dataset.e); ex.comment = t.value; touch(); }
});
view$.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'progSel') { view.progEx = t.value; renderProgress(); return; }
  const row = t.closest('.set[data-e]');
  if (row && t.dataset.f && (t.dataset.f === 'r' || t.dataset.f === 'w')) {
    const ex = getSess().ex.find(x => x.id === row.dataset.e); const s = ex.data[+row.dataset.i];
    if (!s.done && s.w != null && s.r != null) { s.done = true; touch(); }
    refreshCard(ex.id);
  } else if (row) refreshCard(row.dataset.e);
  if (t.dataset.ci) { // on blur: revert an invalid entry to the last saved value
    const f = CI_BY_KEY[t.dataset.ci]; const c = state.checkins[view.date] || {};
    if (!parseCi(f, t.value).ok) { t.value = c[f.k] ?? ''; t.classList.remove('bad'); $('#err-' + f.k).textContent = ''; $('#band-' + f.k).innerHTML = bandHtml(f.k, c[f.k]); toast(`${f.label}: ${f.min}–${f.max} only`); }
    return;
  }
  if (t.id === 'recSel') { view.recMetric = t.value; renderProgress(); return; }
  if (t.id === 'ci-notes') renderHeader();
});
view$.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.parentElement && b.parentElement.id === 'ci-energy') {
    const c = state.checkins[view.date] = state.checkins[view.date] || {}; const n = +b.dataset.n; c.energy = c.energy === n ? null : n; save();
    $$('#ci-energy button').forEach(x => x.classList.toggle('on', +x.dataset.n === c.energy)); return;
  }
  if (b.parentElement && b.parentElement.id === 'unitSeg') { state.units = b.dataset.u; save(); renderMore(); return; }
  if (b.parentElement && b.parentElement.id === 'themeSeg') { state.theme = b.dataset.t; save(); applyTheme(); renderMore(); return; }
  const act = b.dataset.act; if (!act) return;
  const sess = () => getSess();
  const exOf = () => sess().ex.find(x => x.id === (b.dataset.e || (b.closest('[data-e]') || {}).dataset?.e));
  switch (act) {
    case 'chk': {
      const row = b.closest('.set'); const ex = exOf(); const s = ex.data[+row.dataset.i];
      s.done = !s.done;
      if (s.done) { // fill empties from last session / previous set
        const last = lastFor(ex.name, curKey()); const ld = last && last.sets.filter(x => x.done);
        const ref = (ld && (ld[+row.dataset.i] || ld[ld.length - 1])) || null; const prev = ex.data[+row.dataset.i - 1];
        if (s.w == null) { const v = prev && prev.w != null ? prev.w : (ref ? ref.w : null); if (v != null) s.w = v; }
        if (s.r == null) { const v = prev && prev.r != null ? prev.r : (ref ? ref.r : parseTop(ex.reps)); if (v != null) s.r = v; }
        if (s.rpe === '' && prev && prev.rpe !== '') s.rpe = prev.rpe;
      }
      touch(); refreshCard(ex.id); if (navigator.vibrate && s.done) navigator.vibrate(15); renderHeader(); break;
    }
    case 'textdone': { const ex = exOf(); ex.done = !ex.done; touch(); refreshCard(ex.id); renderHeader(); break; }
    case 'addset': { const ex = exOf(); const l = ex.data[ex.data.length - 1]; ex.data.push({ w: l ? l.w : null, r: null, rpe: '', done: false }); touch(); renderLog(); break; }
    case 'rmset': { const ex = exOf(); if (ex.data.length <= 1) break; const l = ex.data[ex.data.length - 1]; if ((l.done || l.w != null || l.r != null) && !confirm('Remove the last set (it has data)?')) break; ex.data.pop(); touch(); renderLog(); break; }
    case 'copylast': {
      const ex = exOf(); const last = lastFor(ex.name, curKey()); const ld = last.sets.filter(x => x.done);
      ex.data.forEach((s, i) => { const r = ld[i] || ld[ld.length - 1]; if (s.w == null && r.w != null) s.w = r.w; if (s.r == null && r.r != null) s.r = r.r; if (s.rpe === '' && r.rpe !== '') s.rpe = r.rpe; });
      touch(); renderLog(); toast('Filled from ' + fmtDate(last.date)); break;
    }
    case 'edit': editDialog(b.dataset.e); break;
    case 'addex': editDialog(null); break;
    case 'summary': openSummary(); break;
    case 'openhist': go(b.dataset.date, b.dataset.day); view.tab = 'log'; render(); window.scrollTo(0, 0); break;
    case 'delhist': if (confirm('Delete this logged session?')) { delete state.sessions[skey(b.dataset.date, b.dataset.day)]; view.virtual = null; save(); renderHistory(); } break;
    case 'exportjson': exportJson(); break;
    case 'copyjson': copyText(backupJson()).then(ok => { if (ok) { state.lastExport = Date.now(); save(); renderMore(); } toast(ok ? 'Backup copied — paste it somewhere safe' : 'Copy failed'); }); break;
    case 'importjson': $('#fileIn').click(); break;
    case 'importtext': openDlg(`<h3>Import backup</h3><textarea class="summary" id="impText" placeholder="Paste backup JSON here"></textarea><div class="dlg-actions"><button class="btn" data-act="closedlg">Cancel</button><button class="btn primary" data-act="doimport">Import</button></div>`); break;
    case 'summaryx': break;
    case 'resetplan': if (confirm('Reset the plan to the default 5 days? Logged history is kept.')) { state.plan = clone(DEFAULT_PLAN); view.virtual = null; save(); toast('Plan reset'); } break;
  }
});
$('#view').addEventListener('change', e => {
  if (e.target.id === 'fileIn' && e.target.files[0]) { const f = e.target.files[0]; const r = new FileReader(); r.onload = () => importData(String(r.result)); r.readAsText(f); e.target.value = ''; }
});
$('#dlg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) { if (e.target.id === 'dlg') closeDlg(); return; }
  if (b.parentElement.id === 'ed-kind') {
    $('#dlg').dataset.kind = b.dataset.k; $$('#ed-kind button').forEach(x => x.classList.toggle('on', x === b)); $('#ed-setsbox').hidden = b.dataset.k === 'text'; return;
  }
  switch (b.dataset.act) {
    case 'closedlg': closeDlg(); break;
    case 'alt': $('#ed-name').value = b.dataset.name; break;
    case 'saveex': saveEdit(); break;
    case 'rmex': removeEx(); break;
    case 'wk': openSummary(addDays($('#dlg').dataset.mon, +b.dataset.d)); break;
    case 'copysum': copyText($('#sumText').value).then(ok => toast(ok ? 'Summary copied — paste it into your chat' : 'Copy failed — select the text and copy manually')); break;
    case 'doimport': if (importData($('#impText').value)) closeDlg(); break;
  }
});

/* ---------- boot ---------- */
applyTheme();
render();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
window.__wl = { get state() { return state; }, view, render, weekSummary };
})();
