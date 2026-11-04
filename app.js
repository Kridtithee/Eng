const words = VOCAB.map(a => ({
  w: a[0], pos: a[1], th: a[2], syn: a[3], ex: a[4], exTh: a[5],
  forms: a[6] ? a[6].split(" | ") : []
}));

const $ = id => document.getElementById(id);
const TH = /[฀-๿]/;

// ---------- เก็บค่าไว้ในเครื่อง (localStorage) ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
let known = load("known", []);
const isKnown = w => known.includes(w);
const saveKnown = () => store("known", known);

const opts = load("opts", { showth: true, hide: false });
$("showth").checked = opts.showth;
$("hide").checked = opts.hide;
const saveOpts = () => store("opts", { showth: $("showth").checked, hide: $("hide").checked });

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ครอบข้อความไทยทั้งก้อน (รวมตัวเลข/อังกฤษที่แทรก) เพื่อให้เบลอได้ทีเดียว
const t = s => s ? `<span class="t">${s}</span>` : "";
// forms: "word (n.) คำแปล" -> เบลอเฉพาะส่วนหลัง (pos)
const tForm = f => {
  const m = f.match(/^(.*?\([^)]*\))\s+(.*)$/);
  return m ? `${m[1]} ${t(m[2])}` : f;
};
// synonyms: เบลอเฉพาะวงเล็บที่เป็นภาษาไทย เช่น miscarriage (การแท้งลูก)
const tSyn = s => s.replace(/\(([^)]*)\)/g, (all, inner) => TH.test(inner) ? `(${t(inner)})` : all);

let tab = "list";
function show(x) {
  tab = x;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.t === x));
  document.querySelectorAll("section").forEach(s => s.hidden = s.id !== x);
  if (x === "quiz") { score = 0; total = 0; cur = null; newQ(); }
  if (x === "cards") flipped = false;
  render();
}

function render() {
  saveOpts();
  document.body.classList.toggle("nothai", !$("showth").checked);
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
    <div>${t(x.exTh)}</div>
    <ul class="forms">${x.forms.map(f => `<li>${tForm(f)}</li>`).join("")}</ul>
    <button onclick="toggleKnown('${x.w}')">${k ? "↩ ยังไม่จำ" : "✅ จำได้แล้ว"}</button>
  </div>`;
}
function renderList() {
  const q = $("q").value.trim().toLowerCase();
  const items = words.filter(x =>
    (!$("hide").checked || !isKnown(x.w)) &&
    [x.w, x.th, x.syn, ...x.forms].join(" ").toLowerCase().includes(q));
  $("count").textContent = `แสดง ${items.length}/${words.length} คำ · จำได้แล้ว ${known.length}`;
  $("listbox").innerHTML = items.map(itemHTML).join("") || "<p>ไม่พบคำ</p>";
}

/* ---------- แฟลชการ์ด ---------- */
let deck = [], idx = 0, flipped = false, order = null;
function buildDeck() {
  let d = words.filter(x => !$("hide").checked || !isKnown(x.w));
  if (order) d = order.map(w => d.find(x => x.w === w)).filter(Boolean);
  deck = d;
  if (idx >= deck.length) idx = 0;
  renderCards();
}
function shuffleDeck() { order = shuffle(words).map(x => x.w); idx = 0; flipped = false; buildDeck(); }
function move(d) { if (!deck.length) return; idx = (idx + d + deck.length) % deck.length; flipped = false; renderCards(); }
function flip(e) {
  // ตอนซ่อนคำไทย: แตะที่ข้อความเบลอ = ดูคำแปล ไม่พลิกการ์ด (แตะตรงอื่นเพื่อพลิก)
  if (e && !$("showth").checked && e.target.closest(".t")) return;
  flipped = !flipped; renderCards();
}
function markCurrent() {
  if (!deck.length) return;
  const w = deck[idx].w;
  if (!isKnown(w)) { known.push(w); saveKnown(); }
  if (!$("hide").checked) idx = (idx + 1) % deck.length;
  flipped = false; buildDeck();
}
function renderCards() {
  if (!deck.length) { $("card").innerHTML = "ไม่มีคำเหลือแล้ว 🎉"; $("pos").textContent = ""; return; }
  const x = deck[idx];
  $("card").innerHTML = flipped
    ? `<div class="big">${t(x.th)}</div><div class="syn">≈ ${tSyn(x.syn)}</div><div class="ex">${x.ex}</div><div>${t(x.exTh)}</div>`
    : `<div class="big">${x.w}</div><small>(${x.pos})</small>`;
  $("pos").textContent = `${idx + 1} / ${deck.length}`;
}

/* ---------- ควิซ ---------- */
let score = 0, total = 0, cur = null;
function newQ() {
  const pool = words.filter(x => !cur || x.w !== cur.w); // ไม่ซ้ำข้อก่อนหน้า
  cur = pool[Math.floor(Math.random() * pool.length)];
  const choices = shuffle([cur, ...shuffle(words.filter(x => x.w !== cur.w)).slice(0, 3)]);
  $("qbox").innerHTML =
    `<div class="qtext">"${cur.th}" ตรงกับคำไหน?</div>` +
    choices.map(o => `<button class="opt" onclick="answer(this,'${o.w}')">${o.w}</button>`).join("");
  $("score").textContent = `คะแนน ${score} / ${total}`;
}
function answer(btn, w) {
  total++;
  const right = w === cur.w;
  if (right) score++;
  document.querySelectorAll(".opt").forEach(b => {
    b.disabled = true;
    if (b.textContent === cur.w) b.classList.add("ok");
  });
  if (!right) btn.classList.add("bad");
  $("qbox").insertAdjacentHTML("beforeend", `<div class="row"><button onclick="newQ()">ข้อต่อไป ▶</button></div>`);
  $("score").textContent = `คะแนน ${score} / ${total}`;
}

render();
