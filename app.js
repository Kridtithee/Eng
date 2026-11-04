const words = VOCAB.map(a => ({
  w: a[0], pos: a[1], th: a[2], syn: a[3], ex: a[4], exTh: a[5],
  forms: a[6] ? a[6].split(" | ") : []
}));

const $ = id => document.getElementById(id);
let known = [];
try { known = JSON.parse(localStorage.getItem("known") || "[]"); } catch (e) {}
const save = () => localStorage.setItem("known", JSON.stringify(known));
const isKnown = w => known.includes(w);
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let tab = "list";
function show(t) {
  tab = t;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.t === t));
  document.querySelectorAll("section").forEach(s => s.hidden = s.id !== t);
  if (t === "cards") resetDeck();
  if (t === "quiz") { score = 0; total = 0; newQ(); }
  render();
}

function toggleKnown(w) {
  known = isKnown(w) ? known.filter(x => x !== w) : [...known, w];
  save();
  render();
}

/* ---------- รายการ ---------- */
function itemHTML(x) {
  const k = isKnown(x.w);
  return `<div class="item ${k ? "done" : ""}">
    <h3>${x.w} <small>(${x.pos})</small> — ${x.th}</h3>
    <div class="syn">≈ ${x.syn}</div>
    <div class="ex">${x.ex}</div>
    <div class="th">${x.exTh}</div>
    <ul class="forms">${x.forms.map(f => `<li>${f}</li>`).join("")}</ul>
    <button onclick="toggleKnown('${x.w}')">${k ? "↩ ยังไม่จำ" : "✅ จำได้แล้ว"}</button>
  </div>`;
}

function renderList() {
  const q = $("q").value.trim().toLowerCase();
  const hide = $("hide").checked;
  const items = words.filter(x =>
    (!hide || !isKnown(x.w)) &&
    (x.w + x.th + x.syn + x.forms.join(" ")).toLowerCase().includes(q));
  $("count").textContent = `แสดง ${items.length}/${words.length} คำ · จำได้แล้ว ${known.length}`;
  $("listbox").innerHTML = items.map(itemHTML).join("") || "<p>ไม่พบคำ</p>";
}

/* ---------- แฟลชการ์ด ---------- */
let deck = [], idx = 0, flipped = false;
function resetDeck() {
  deck = words.filter(x => !$("hide2").checked || !isKnown(x.w));
  idx = 0; flipped = false; renderCards();
}
function shuffleDeck() { deck = shuffle(deck); idx = 0; flipped = false; renderCards(); }
function move(d) {
  if (!deck.length) return;
  idx = (idx + d + deck.length) % deck.length;
  flipped = false; renderCards();
}
function flip() { flipped = !flipped; renderCards(); }
function markCurrent() {
  if (!deck.length) return;
  const w = deck[idx].w;
  if (!isKnown(w)) { known.push(w); save(); }
  if ($("hide2").checked) { deck.splice(idx, 1); if (idx >= deck.length) idx = 0; }
  else idx = (idx + 1) % deck.length;
  flipped = false; renderCards();
}
function renderCards() {
  if (!deck.length) {
    $("card").innerHTML = "🎉 ไม่มีคำเหลือแล้ว";
    $("pos").textContent = ""; return;
  }
  const x = deck[idx];
  $("card").innerHTML = flipped
    ? `<div class="big">${x.th}</div><div class="syn">≈ ${x.syn}</div><div class="ex">${x.ex}</div>`
    : `<div class="big">${x.w}</div><small>(${x.pos})</small>`;
  $("pos").textContent = `${idx + 1} / ${deck.length}`;
}

/* ---------- ควิซ ---------- */
let score = 0, total = 0, cur = null;
function newQ() {
  cur = words[Math.floor(Math.random() * words.length)];
  const wrong = shuffle(words.filter(x => x.w !== cur.w)).slice(0, 3);
  const opts = shuffle([cur, ...wrong]);
  $("qbox").innerHTML =
    `<div class="qtext">"${cur.th}" ตรงกับคำไหน?</div>` +
    opts.map(o => `<button class="opt" onclick="answer(this,'${o.w}')">${o.w}</button>`).join("");
  renderScore();
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
  $("qbox").insertAdjacentHTML("beforeend",
    `<div class="row"><button onclick="newQ()">ข้อต่อไป ▶</button></div>`);
  renderScore();
}
function renderScore() { $("score").textContent = `คะแนน ${score} / ${total}`; }

function render() { if (tab === "list") renderList(); }
render();
