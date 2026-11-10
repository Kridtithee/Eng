const words = VOCAB.map(a => ({
  w: a[0], pos: a[1], th: a[2], syn: a[3], ex: a[4], exTh: a[5],
  forms: a[6] ? a[6].split(" | ") : []
}));

const $ = id => document.getElementById(id);
const TH = /[\u0E00-\u0E7F]/;

/* ---------- localStorage ---------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

let known = load("known", []);
const isKnown = w => known.includes(w);
const saveKnown = () => store("known", known);

// ฟีเจอร์ "ซ่อนคำที่จำแล้ว" ถูกยกเลิกแล้ว → บังคับ false เพื่อกันค่าค้างจากเวอร์ชันเก่า
const showth = load("showth", true);
const hide = false;

/* ---------- utils ---------- */
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const t = s => s ? `<span class="t">${s}</span>` : "";
const tForm = f => {
  const m = f.match(/^(.*?\([^)]*\))\s+(.*)$/);
  return m ? `${m[1]} ${t(m[2])}` : f;
};
const tSyn = s => s.replace(/\(([^)]*)\)/g, (all, inner) => TH.test(inner) ? `(${t(inner)})` : all);

/* ---------- tabs ---------- */
let tab = "list";
function show(x) {
  const same = tab === x;
  tab = x;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.t === x));
  document.querySelectorAll("section").forEach(s => s.hidden = s.id !== x);

  // เข้าแท็บ quiz/odd ครั้งแรก (cur ยังว่าง) → เริ่มใหม่
  // ถ้าต้องการให้กดแท็บเดิมซ้ำแล้วรีเซ็ตด้วย เปลี่ยนเงื่อนไขเป็น (!same || !cur)
  if (x === "quiz" && !cur) { score = 0; total = 0; newQ(); }
  if (x === "odd" && !oddCur) { oddScore = 0; oddTotal = 0; newOdd(); }
  if (x === "cards") flipped = false;

  render();
}

function render() {
  document.body.classList.toggle("nothai", !showth);
  if (tab === "list") renderList();
  if (tab === "cards") buildDeck();
}

/* ---------- รายการ ---------- */
function toggleKnown(w) {
  known = isKnown(w) ? known.filter(x => x !== w) : [...known, w];
  saveKnown(); render();
}

function itemHTML(x) {
  const k = isKnown(x.w);
  return `<div class="item ${k ? "done" : ""}">
    <h3>${x.w} <small>(${x.pos})</small> — ${t(x.th)}</h3>
    <div class="syn">≈ ${tSyn(x.syn)}</div>
    <div class="ex">${x.ex}</div>
    <div class="ext">${t(x.exTh)}</div>
    ${x.forms.length ? `<ul class="forms">${x.forms.map(f => `<li>${tForm(f)}</li>`).join("")}</ul>` : ""}
    <button onclick="toggleKnown('${x.w}')">${k ? "↩ ยังไม่จำ" : "✅ จำได้แล้ว"}</button>
  </div>`;
}

function renderList() {
  const q = $("q").value.trim().toLowerCase();
  const items = words.filter(x =>
    (!hide || !isKnown(x.w)) &&
    [x.w, x.th, x.syn, ...x.forms].join(" ").toLowerCase().includes(q));
  $("count").textContent = `แสดง ${items.length}/${words.length} คำ · จำได้แล้ว ${known.length}`;
  $("listbox").innerHTML = items.map(itemHTML).join("") || `<p class="muted">ไม่พบคำ</p>`;
}

/* ---------- แฟลชการ์ด ---------- */
let deck = [], idx = 0, flipped = false, order = null;

function buildDeck() {
  let d = words.filter(x => !hide || !isKnown(x.w));
  if (order) d = order.map(w => d.find(x => x.w === w)).filter(Boolean);
  deck = d;
  if (idx >= deck.length) idx = 0;
  renderCards();
}

function shuffleDeck() {
  order = shuffle(words).map(x => x.w);
  idx = 0; flipped = false;
  buildDeck();
}

function move(d) {
  if (!deck.length) return;
  idx = (idx + d + deck.length) % deck.length;
  flipped = false;
  renderCards();
}

function flip(e) {
  if (e && !showth && e.target.closest(".t")) return;
  flipped = !flipped;
  renderCards();
}

function markCurrent() {
  if (!deck.length) return;
  const w = deck[idx].w;
  if (!isKnown(w)) { known.push(w); saveKnown(); }
  if (!hide) idx = (idx + 1) % deck.length;
  flipped = false;
  buildDeck();
}

function renderCards() {
  if (!deck.length) {
    $("card").innerHTML = "ไม่มีคำเหลือแล้ว 🎉";
    $("pos").textContent = "";
    return;
  }
  const x = deck[idx];
  $("card").innerHTML = flipped
    ? `<div class="big">${t(x.th)}</div>
       <div class="syn">≈ ${tSyn(x.syn)}</div>
       <div class="ex">${x.ex}</div>
       <div class="ext">${t(x.exTh)}</div>`
    : `<div class="big">${x.w}</div><small>(${x.pos})</small>`;
  $("pos").textContent = `${idx + 1} / ${deck.length}`;
}

/* ---------- ควิซ ---------- */
let score = 0, total = 0, cur = null;

function newQ() {
  const pool = words.filter(x => !cur || x.w !== cur.w);
  cur = pool[Math.floor(Math.random() * pool.length)];
  const choices = shuffle([cur, ...shuffle(words.filter(x => x.w !== cur.w)).slice(0, 3)]);
  $("qbox").innerHTML =
    `<div class="qtext">"${cur.th}" ตรงกับคำไหน?</div>` +
    choices.map(o =>
      `<button class="opt" data-w="${o.w}" onclick="answer(this)">${o.w}</button>`
    ).join("");
  $("score").textContent = `คะแนน ${score} / ${total}`;
}

function answer(btn) {
  const w = btn.dataset.w;
  total++;
  const right = w === cur.w;
  if (right) score++;
  document.querySelectorAll(".opt").forEach(b => {
    b.disabled = true;
    if (b.dataset.w === cur.w) b.classList.add("ok");
  });
  if (!right) btn.classList.add("bad");
  $("qbox").insertAdjacentHTML("beforeend",
    `<div class="row"><button class="primary" onclick="newQ()">ข้อต่อไป ▶</button></div>`);
  $("score").textContent = `คะแนน ${score} / ${total}`;
}

/* ---------- หาคำต่าง ---------- */
let oddScore = 0, oddTotal = 0, oddCur = null;

function newOdd() {
  const pool = shuffle(words.filter(x => !oddCur || x.w !== oddCur.w));
  const groupBy = {};
  pool.forEach(x => { (groupBy[x.pos] ||= []).push(x); });
  const bigGroups = Object.values(groupBy).filter(g => g.length >= 3);

  let same, diff;
  if (bigGroups.length) {
    const g = shuffle(bigGroups)[0];
    same = shuffle(g).slice(0, 3);
    diff = shuffle(words.filter(x => !same.some(s => s.w === x.w)))[0];
  } else {
    const four = shuffle(words).slice(0, 4);
    same = four.slice(0, 3);
    diff = four[3];
  }
  const options = shuffle([...same, diff]);
  oddCur = { same, diff, options };

  $("oddbox").innerHTML =
    `<div class="qtext">คำไหน <b>ไม่เข้าพวก</b>?</div>` +
    options.map(o =>
      `<button class="opt" data-w="${o.w}" onclick="answerOdd(this)">${o.w} <small style="color:var(--dim)">(${o.th})</small></button>`
    ).join("");
  $("oddScore").textContent = `คะแนน ${oddScore} / ${oddTotal}`;
}

function answerOdd(btn) {
  const w = btn.dataset.w;
  oddTotal++;
  const right = w === oddCur.diff.w;
  if (right) oddScore++;
  document.querySelectorAll("#oddbox .opt").forEach(b => {
    b.disabled = true;
    if (b.dataset.w === oddCur.diff.w) b.classList.add("ok");
  });
  if (!right) btn.classList.add("bad");
  $("oddbox").insertAdjacentHTML("beforeend",
    `<div class="row"><button class="primary" onclick="newOdd()">ข้อต่อไป ▶</button></div>`);
  $("oddScore").textContent = `คะแนน ${oddScore} / ${oddTotal}`;
}

/* ---------- init ---------- */
render();
