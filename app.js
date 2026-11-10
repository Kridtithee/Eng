/* ---------- รอ DOM + VOCAB พร้อมก่อนทำงาน ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof VOCAB === "undefined" || !Array.isArray(VOCAB)) {
    console.error("VOCAB ไม่ถูกโหลด — ตรวจสอบ vocab.js");
    document.querySelector("main").innerHTML =
      '<p style="color:#e05252;text-align:center;padding:40px">โหลดข้อมูลคำศัพท์ไม่สำเร็จ<br>กรุณาตรวจสอบไฟล์ vocab.js</p>';
    return;
  }
  initApp();
});

/* ---------- ตัวแอปทั้งหมด ---------- */
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
  
  // ฟังก์ชันช่วยดึงคำเดี่ยวๆ ออกจาก syn (เช่น "miscarriage (การแท้งลูก)" -> "miscarriage")
  function cleanSyn(str) {
    return str.replace(/\([^)]*\)/g, "").split(",").map(s => s.trim()).filter(Boolean);
  }

  function newOdd() {
    // 1. สุ่มเลือกคำตั้งต้น (Target)
    const target = shuffle(words.filter(x => !oddCur || x.w !== oddCur.w))[0];
    
    // 2. ดึง Synonym ของ Target มาเป็นตัวลวง (Distractors) 3 คำ
    const targetSyns = cleanSyn(target.syn);
    
    // ถ้า target มี syn ไม่ถึง 3 คำ ให้ fallback ไปใช้วิธีสุ่ม 4 คำจาก pos เดียวกัน
    if (targetSyns.length < 3) {
      const pool = shuffle(words);
      const four = pool.slice(0, 4);
      oddCur = {
        same: four.slice(0, 3),
        diff: four[3],
        isFallback: true
      };
      renderOdd();
      return;
    }

    const distractors = shuffle(targetSyns).slice(0, 3);
    
    // 3. หาคำแปลกปลอม (Odd one out) ที่ไม่มีความเกี่ยวข้องกับ Target
    // ใช้วิธีหา synonym ของคำอื่น ที่ไม่ซ้ำกับ targetSyns เลย
    let oddWord = null;
    const others = shuffle(words.filter(x => x.w !== target.w));
    for (const o of others) {
      const otherSyns = cleanSyn(o.syn);
      // เช็คว่าไม่มีคำไหนใน otherSyns ไปซ้ำกับ targetSyns หรือตัว Target เอง
      const overlap = otherSyns.some(s => 
        targetSyns.includes(s) || 
        s.toLowerCase() === target.w.toLowerCase() || 
        targetSyns.some(ts => ts.toLowerCase() === o.w.toLowerCase())
      );
      if (!overlap) {
        // สุ่มเลือก 1 คำจาก syn ของคำอื่น (หรือใช้ตัวคำนั้นเอง)
        oddWord = otherSyns.length ? shuffle(otherSyns)[0] : o.w;
        break;
      }
    }

    // ถ้าหาไม่ได้ให้ fallback
    if (!oddWord) {
       oddWord = "unknown";
    }

    // 4. ประกอบร่างเป็นตัวเลือก 4 ตัว (สลับที่)
    const options = shuffle([
      ...distractors.map(w => ({ text: w, isOdd: false })),
      { text: oddWord, isOdd: true }
    ]);

    // เก็บ state ไว้ตอบ
    oddCur = {
      target,
      same: distractors,
      diff: oddWord,
      options,
      isFallback: false,
      answered: false
    };
    renderOdd();
  }
  window.newOdd = newOdd;

  function renderOdd() {
    if (!oddCur) return;

    // แสดงคำถาม
    let html = `<div class="qtext">คำไหน <b>ไม่เข้าพวก</b> กับคำว่า "${oddCur.target.w}"?</div>`;
    
    // ถ้ามีการตอบแล้ว ให้แสดงเฉลยภาษาไทยใต้โจทย์
    if (oddCur.answered) {
      html += `<div class="muted" style="text-align:left; padding:0 10px 10px; font-size:.95rem;">
        <b>เป้าหมาย:</b> ${oddCur.target.w} — ${t(oddCur.target.th)}<br>
        <b>คำตอบ:</b> ${oddCur.diff} — ${t(oddCur.diffTh || "")}
      </div>`;
    }

    // แสดงปุ่มตัวเลือก
    html += oddCur.options.map(o =>
      `<button class="opt" data-w="${o.text}" onclick="answerOdd(this, ${o.isOdd})">${o.text}</button>`
    ).join("");

    $("oddbox").innerHTML = html;
    $("oddScore").textContent = `คะแนน ${oddScore} / ${oddTotal}`;
  }

  window.answerOdd = function (btn, isOdd) {
    if (oddCur.answered) return; // กันกดซ้ำ
    oddCur.answered = true;

    oddTotal++;
    if (isOdd) oddScore++;

    // หาคำแปลไทยของ diff
    const diffObj = words.find(x => x.w === oddCur.diff) || 
                    words.find(x => cleanSyn(x.syn).includes(oddCur.diff));
    oddCur.diffTh = diffObj ? diffObj.th : "";

    // อัปเดต UI เฉลย
    document.querySelectorAll("#oddbox .opt").forEach(b => {
      b.disabled = true;
      const isThisOdd = b.dataset.w === oddCur.diff;
      if (isThisOdd) b.classList.add("ok");
      else if (b === btn) b.classList.add("bad");
    });

    // แทรกข้อความเฉลยภาษาไทย (ภาษาคนอ่านง่าย)
    const targetTh = oddCur.target.th;
    const diffTh = oddCur.diffTh;
    const diffPron = oddCur.diff; // คำอังกฤษ
    
    let explanation = `<div class="muted" style="text-align:left; padding:12px 10px; font-size:.95rem; line-height:1.6; background:var(--panel); border-radius:10px; margin-top:10px;">
      <b>คำตอบ:</b> <span style="color:var(--ok); font-weight:600;">${diffPron}</span> ${diffTh ? `(แปลว่า ${t(diffTh)})` : ""}<br>
      <span style="font-size:.85rem; color:var(--dim);">
        ส่วนอีก 3 คำ เป็นคำพ้องความหมาย (synonyms) ของ "${oddCur.target.w}" ซึ่งแปลว่า ${t(targetTh)}
      </span>
    </div>`;

    $("oddbox").insertAdjacentHTML("beforeend", explanation);
    $("oddbox").insertAdjacentHTML("beforeend",
      `<div class="row"><button class="primary" onclick="newOdd()">ข้อต่อไป ▶</button></div>`);

    $("oddScore").textContent = `คะแนน ${oddScore} / ${oddTotal}`;
  };

  /* ---------- init ---------- */
  render();
}
