/* ---------- รอ DOM + VOCAB พร้อม ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof VOCAB === "undefined" || !Array.isArray(VOCAB)) {
    console.error("VOCAB ไม่ถูกโหลด — ตรวจสอบ vocab.js");
    document.querySelector("main").innerHTML =
      '<p style="color:#e05252;text-align:center;padding:40px">โหลดข้อมูลคำศัพท์ไม่สำเร็จ</p>';
    return;
  }
  initApp();
});

function initApp() {
  const words = VOCAB.map(a => ({
    w: a[0], pos: a[1], th: a[2], syn: a[3], ex: a[4], exTh: a[5],
    forms: a[6] ? a[6].split(" | ") : []
  }));

  const $ = id => document.getElementById(id);
  const TH = /[\u0E00-\u0E7F]/;

  /* ---------- localStorage ---------- */
  const load = (k, d) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }
    catch (e) { return d; }
  };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let known = load("known", []);
  if (!Array.isArray(known)) known = [];
  known = known.filter(x => typeof x === "string" && words.some(w => w.w === x));
  const isKnown = w => known.includes(w);
  const saveKnown = () => store("known", known);

  const showth = load("showth", true) !== false;
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

  /* ---------- state ---------- */
  let tab = "list";
  let deck = [], idx = 0, flipped = false, order = null;
  let score = 0, total = 0, cur = null;
  let oddScore = 0, oddTotal = 0, oddCur = null;

  /* ---------- tabs ---------- */
  window.show = function (x) {
    const same = tab === x;
    tab = x;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.t === x));
    document.querySelectorAll("section").forEach(s => s.hidden = s.id !== x);

    if (x === "quiz" && !cur) { score = 0; total = 0; newQ(); }
    if (x === "odd" && !oddCur) { oddScore = 0; oddTotal = 0; newOdd(); }
    if (x === "cards") flipped = false;

    render();
  };

  function render() {
    document.body.classList.toggle("nothai", !showth);
    if (tab === "list") renderList();
    if (tab === "cards") buildDeck();
  }

  /* ---------- รายการ ---------- */
  window.toggleKnown = function (w) {
    known = isKnown(w) ? known.filter(x => x !== w) : [...known, w];
    saveKnown(); render();
  };

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
    const q = ($("q")?.value || "").trim().toLowerCase();
    const items = words.filter(x =>
      (!hide || !isKnown(x.w)) &&
      [x.w, x.th, x.syn, ...x.forms].join(" ").toLowerCase().includes(q));
    $("count").textContent = `แสดง ${items.length}/${words.length} คำ · จำได้แล้ว ${known.length}`;
    $("listbox").innerHTML = items.map(itemHTML).join("") || `<p class="muted">ไม่พบคำ</p>`;
  }

  /* ---------- แฟลชการ์ด ---------- */
  function buildDeck() {
    let d = words.filter(x => !hide || !isKnown(x.w));
    if (order) d = order.map(w => d.find(x => x.w === w)).filter(Boolean);
    deck = d;
    if (idx >= deck.length) idx = 0;
    renderCards();
  }

  window.shuffleDeck = function () {
    order = shuffle(words).map(x => x.w);
    idx = 0; flipped = false;
    buildDeck();
  };

  window.move = function (d) {
    if (!deck.length) return;
    idx = (idx + d + deck.length) % deck.length;
    flipped = false;
    renderCards();
  };

  window.flip = function (e) {
    if (e && !showth && e.target.closest(".t")) return;
    flipped = !flipped;
    renderCards();
  };

  window.markCurrent = function () {
    if (!deck.length) return;
    const w = deck[idx].w;
    if (!isKnown(w)) { known.push(w); saveKnown(); }
    if (!hide) idx = (idx + 1) % deck.length;
    flipped = false;
    buildDeck();
  };

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
  window.newQ = newQ;

  window.answer = function (btn) {
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
  };

  /* ---------- หาคำต่าง (Family-based) ---------- */

  // แปลง syn string → array ของคำเดี่ยว (ตัดวงเล็บ, dedupe case-insensitive)
  function cleanSyn(str) {
    if (!str) return [];
    const seen = new Set();
    const out = [];
    str.replace(/\([^)]*\)/g, "").split(",").forEach(s => {
      const orig = s.trim();
      const k = orig.toLowerCase();
      if (k && !seen.has(k)) { seen.add(k); out.push(orig); }
    });
    return out;
  }

  function newOdd() {
    // ลองสูงสุด 20 ครั้งเพื่อให้ได้ชุดที่สมบูรณ์
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidates = words.filter(x =>
        cleanSyn(x.syn).length >= 2 &&
        (!oddCur || x.w !== oddCur.target.w)
      );
      if (!candidates.length) break;

      const target = shuffle(candidates)[0];
      const targetSyns = cleanSyn(target.syn);

      // 2 family words จาก syn ของ target
      const familyWords = shuffle(targetSyns).slice(0, 2);

      // set คำที่ห้ามซ้ำ (lowercase)
      const excluded = new Set([
        target.w.toLowerCase(),
        ...targetSyns.map(s => s.toLowerCase()),
        ...familyWords.map(s => s.toLowerCase())
      ]);

      // หาคำต่างจากคำอื่น
      let oddWord = null, oddSource = null, oddIsSyn = false;
      const others = shuffle(words.filter(x => x.w !== target.w));

      for (const o of others) {
        // ลอง syn ของ o ก่อน (ตรงตามโจทย์)
        const validSyns = cleanSyn(o.syn).filter(s => !excluded.has(s.toLowerCase()));
        if (validSyns.length) {
          oddWord = shuffle(validSyns)[0];
          oddSource = o;
          oddIsSyn = true;
          break;
        }
        // ถ้าไม่มี syn ที่ใช้ได้ ลองใช้ตัว o.w เอง
        if (!excluded.has(o.w.toLowerCase())) {
          oddWord = o.w;
          oddSource = o;
          oddIsSyn = false;
          break;
        }
      }

      if (!oddWord) continue;

      // ประกอบ 4 ตัวเลือก
      const rawOptions = [
        { text: target.w,    type: 'target' },
        { text: familyWords[0], type: 'family' },
        { text: familyWords[1], type: 'family' },
        { text: oddWord,      type: 'odd' }
      ];

      // dedupe (case-insensitive) + ต้องได้ครบ 4
      const seen = new Set();
      const options = rawOptions.filter(o => {
        const k = o.text.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (options.length !== 4) continue; // ลองใหม่

      oddCur = {
        target,
        familyWords,
        oddWord,
        oddSource,
        oddIsSyn,
        options: shuffle(options),
        answered: false
      };
      renderOdd();
      return;
    }

    // fallback: สุ่ม 4 คำจากคลัง
    const four = shuffle(words).slice(0, 4);
    oddCur = {
      target: four[0],
      familyWords: [four[1].w, four[2].w],
      oddWord: four[3].w,
      oddSource: four[3],
      oddIsSyn: false,
      options: shuffle([
        { text: four[0].w, type: 'target' },
        { text: four[1].w, type: 'family' },
        { text: four[2].w, type: 'family' },
        { text: four[3].w, type: 'odd' }
      ]),
      answered: false,
      isFallback: true
    };
    renderOdd();
  }
  window.newOdd = newOdd;

  function renderOdd() {
    if (!oddCur) return;

    const html =
      `<div class="qtext">
         คำไหน <b>ไม่เข้าพวก</b> กับคำว่า
         <span style="color:var(--accent);">"${oddCur.target.w}"</span>?
       </div>` +
      oddCur.options.map(o =>
        `<button class="opt" data-w="${o.text}" data-type="${o.type}" onclick="answerOdd(this)">${o.text}</button>`
      ).join("");

    $("oddbox").innerHTML = html;
    $("oddScore").textContent = `คะแนน ${oddScore} / ${oddTotal}`;
  }

  window.answerOdd = function (btn) {
    if (!oddCur || oddCur.answered) return;
    oddCur.answered = true;

    const pickedType = btn.dataset.type;
    const isCorrect = pickedType === 'odd';

    oddTotal++;
    if (isCorrect) oddScore++;

    document.querySelectorAll("#oddbox .opt").forEach(b => {
      b.disabled = true;
      if (b.dataset.type === 'odd') b.classList.add("ok");
      else if (b === btn) b.classList.add("bad");
    });

    // สร้างคำอธิบายเฉลย
    const tgt = oddCur.target;
    const fam = oddCur.familyWords;
    const oddW = oddCur.oddWord;
    const oddSrc = oddCur.oddSource;

    // คำแปลของ oddWord — อ้างอิง context ให้ถูกต้อง
    let oddExplain;
    if (oddCur.oddIsSyn) {
      oddExplain = `<b style="color:var(--txt);">${oddW}</b> — เป็นคำพ้องของ
        <b>${oddSrc.w}</b> (${t(oddSrc.th)})`;
    } else {
      oddExplain = `<b style="color:var(--txt);">${oddW}</b> — แปลว่า ${t(oddSrc.th)}`;
    }

    const explanation = `
      <div style="text-align:left; padding:14px 16px; background:var(--panel);
                  border:1px solid var(--line); border-radius:12px; margin-top:12px;
                  font-size:.95rem; line-height:1.7;">
        <div style="color:var(--ok); font-weight:600; margin-bottom:8px;">
          ✓ คำตอบที่ถูก: ${oddW}
        </div>
        <div style="color:var(--dim); font-size:.88rem; margin-bottom:6px;">
          <b>${tgt.w}</b> ${t(tgt.th)}
        </div>
        <div style="color:var(--dim); font-size:.88rem; margin-bottom:8px;">
          ${fam.join(", ")} เป็นคำพ้องความหมาย (synonyms) ของ <b>${tgt.w}</b>
        </div>
        <div style="color:var(--dim); font-size:.88rem;">
          ส่วน ${oddExplain} → ไม่เข้าพวก
        </div>
      </div>`;

    $("oddbox").insertAdjacentHTML("beforeend", explanation);
    $("oddbox").insertAdjacentHTML("beforeend",
      `<div class="row"><button class="primary" onclick="newOdd()">ข้อต่อไป ▶</button></div>`);

    $("oddScore").textContent = `คะแนน ${oddScore} / ${oddTotal}`;
  };

  /* ---------- init ---------- */
  render();
}
