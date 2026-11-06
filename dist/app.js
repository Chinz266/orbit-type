import { summarize } from "./history.js";
import { AccountHistory } from "./account-history.js";
import { initAccount } from "./auth-ui.js";
import { Session, lessons } from "./engine.js";
import {
  categories,
  shiftedThaiRows,
  getWordBank,
  shuffled,
} from "./vocabulary.js";
const $ = (id) => document.getElementById(id),
  s = new Session();
let mode = "practice",
  phase = "idle",
  elapsed = 0,
  last = 0,
  index = 0,
  animation = null,
  wordTimer = null;
let wordQueue = [];
let accountUser = null;
let authReady = false;
const historyStore = new AccountHistory({ onChange: (rows, status, storageOK) => {
  history = rows; renderHistory(); showBest();
  const messages = { guest: 'ผู้เยี่ยมชม · ประวัติเก็บเฉพาะเบราว์เซอร์นี้', loading: 'กำลังโหลดประวัติบัญชี…', syncing: 'กำลังซิงก์ประวัติ…', synced: 'ประวัติส่วนตัว · ซิงก์กับบัญชีแล้ว', pending: 'มีรอบรอซิงก์', error: 'ซิงก์ไม่สำเร็จ · เก็บรอบใหม่ในเครื่องไว้รอส่ง ลองซิงก์อีกครั้งเมื่อออนไลน์' };
  $("history-note").textContent = messages[status] + (storageOK ? '' : ' · บันทึกในเครื่องไม่สำเร็จ อย่าเพิ่งปิดหน้านี้จนกว่าจะซิงก์สำเร็จ');
  $("sync-history").hidden = !accountUser;
  $("sync-history").disabled = ['loading', 'syncing'].includes(status);
  $("import-history").hidden = !accountUser || !historyStore.guest.length;
}});
let history = historyStore.rows();
const rowsEN = ["1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];
const rowsTH = ["ๅ/-ภถุึคตจขช", "ๆไำพะัีรนยบล", "ฟหกดเ้่าสวง", "ผปแอิืทมใฝ"];
const fingers = [
  "นิ้วก้อยซ้าย",
  "นิ้วนางซ้าย",
  "นิ้วกลางซ้าย",
  "นิ้วชี้ซ้าย",
  "นิ้วชี้ซ้าย",
  "นิ้วชี้ขวา",
  "นิ้วชี้ขวา",
  "นิ้วกลางขวา",
  "นิ้วนางขวา",
  "นิ้วก้อยขวา",
  "นิ้วก้อยขวา",
  "นิ้วก้อยขวา",
];
function bestKey() {
  const base = `orbit-best-${$("language").value}-${$("level").value}-${mode}`;
  return $("level").value === "home" || $("category").value === "space"
    ? base
    : `${base}-${$("category").value}`;
}
function loadBest() {
  if (accountUser) return Math.max(0, ...history.filter(r => r.language === $("language").value && r.level === $("level").value && r.mode === mode && (r.level === 'home' || (r.categoryId ? r.categoryId === $("category").value : r.category === $("category").selectedOptions[0].textContent))).map(r => r.score));
  try {
    return Number(localStorage.getItem(bestKey())) || 0;
  } catch {
    return 0;
  }
}
function showBest() {
  $("best").innerHTML = `${loadBest()} <small>คะแนน</small>`;
}
function keyboard() {
  const thai = $("language").value === "th";
  const rows = thai ? rowsTH : rowsEN;
  const expected = s.word[s.position];
  const shifted =
    thai &&
    !!expected &&
    !rows.some((row) => row.includes(expected)) &&
    shiftedThaiRows.some((row) => row.includes(expected));
  $("keyboard").replaceChildren();
  let finger = "วางนิ้วบนแถวเหย้า";
  rows.forEach((row, r) => {
    const div = document.createElement("div");
    div.className = "key-row";
    [...row].forEach((c, i) => {
      const glyph = shifted ? shiftedThaiRows[r][i] : c;
      const k = document.createElement("span");
      k.className = "key" + (r === 2 && (i === 3 || i === 6) ? " home" : "");
      k.textContent = glyph;
      if ($("hints").checked && phase === "running" && glyph === expected) {
        k.classList.add("next");
        finger =
          fingers[Math.max(0, r === 0 ? i - 1 : i)] +
          (shifted ? (i < 5 ? " + Shift ขวา" : " + Shift ซ้าย") : "");
      }
      div.append(k);
    });
    $("keyboard").append(div);
  });
  $("finger").textContent = $("hints").checked
    ? finger
    : "ปิดตัวช่วย · ลองใช้ความจำของนิ้ว";
}
function displayWord() {
  $("word").replaceChildren();
  [...s.word].forEach((c, i) => {
    const span = document.createElement("span");
    span.textContent = c;
    span.className =
      i < s.position ? "correct" : i === s.position ? "next" : "";
    $("word").append(span);
  });
  keyboard();
}
function bank() {
  return getWordBank(
    $("language").value,
    $("level").value,
    $("category").value,
    lessons,
  );
}
function nextWord() {
  const words = bank();
  if (!wordQueue.length)
    wordQueue = $("level").value === "home" ? [...words] : shuffled(words);
  let word = wordQueue.shift();
  index++;
  if (index % 4 === 0 && Object.keys(s.mistakes).length) {
    const weak = Object.entries(s.mistakes).sort((a, b) => b[1] - a[1])[0][0];
    word = words.find((w) => w.includes(weak) && w !== s.word) || word;
  }
  s.setWord(word);
  $("typing").value = "";
  displayWord();
  $("combo").textContent =
    s.combo > 1
      ? `✦ COMBO ×${s.combo} · ไปต่อได้เลย!`
      : "พิมพ์ให้ถูกทีละตัว · ไม่ต้องกด Enter";
}
function stats() {
  $("score").textContent = String(s.score).padStart(4, "0");
  $("accuracy").innerHTML =
    `${s.hits + s.errors ? s.accuracy() : "—"}<small>%</small>`;
  $("wpm").innerHTML = `${s.wpm(elapsed)}<small>WPM</small>`;
  let t =
    mode === "timed"
      ? Math.max(0, Math.ceil(60 - elapsed))
      : Math.floor(elapsed);
  $("time").textContent =
    `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  $("destroyed").textContent = s.targets;
}
function lock(active) {
  $("account-login").disabled = active;
  $("account-logout").disabled = active;
  $("import-history").disabled = active;
  $("language").disabled = active;
  $("level").disabled = active;
  $("category").disabled = active || $("level").value === "home";
  document.querySelectorAll(".mode").forEach((b) => (b.disabled = active));
  $("pause").disabled = !active;
}
function start() {
  if (!authReady) return;
  clearTimeout(wordTimer);
  s.reset();
  wordQueue = [];
  elapsed = 0;
  index = 0;
  phase = "running";
  last = performance.now();
  lock(true);
  $("typing").disabled = false;
  $("typing").value = "";
  $("typing").classList.remove("wrong");
  $("typing").placeholder = "พิมพ์คำเป้าหมายที่นี่";
  $("start").innerHTML = "จบการฝึก <span>□</span>";
  $("pause").textContent = "Ⅱ พัก";
  $("target-label").textContent =
    $("level").value === "home"
      ? "ฝึกแถวเหย้า"
      : $("category").selectedOptions[0].textContent;
  $("status").textContent = "IN FLIGHT / กำลังฝึก";
  $("time-label").textContent = mode === "timed" ? "เวลาที่เหลือ" : "เวลาฝึก";
  $("feedback").textContent = "พิมพ์ผิดลองใหม่ได้เลย ไม่ต้องลบ";
  nextWord();
  stats();
  $("typing").focus();
}
function pause() {
  if (phase === "running") {
    phase = "paused";
    $("typing").disabled = true;
    $("pause").textContent = "▶ ฝึกต่อ";
    $("status").textContent = "PAUSED / หยุดพัก";
    $("feedback").textContent = "กดฝึกต่อ หรือ Esc เพื่อกลับเข้าภารกิจ";
  } else if (phase === "paused") {
    phase = "running";
    last = performance.now();
    $("typing").disabled = false;
    $("pause").textContent = "Ⅱ พัก";
    $("status").textContent = "IN FLIGHT / กำลังฝึก";
    $("typing").focus();
  }
  keyboard();
}
function finish() {
  if (phase === "idle") return;
  phase = "idle";
  clearTimeout(wordTimer);
  lock(false);
  $("typing").disabled = true;
  $("start").innerHTML = "เริ่มภารกิจ <span>↗</span>";
  $("status").textContent = "COMPLETE / จบภารกิจ";
  try {
    if (!accountUser) localStorage.setItem(bestKey(), Math.max(loadBest(), s.score));
  } catch {}
  showBest();
  stats();
  $("result-caption").textContent =
    `ทำลาย ${s.targets} เป้าหมาย · ฝึกไป ${Math.floor(elapsed)} วินาที`;
  $("result-stats").innerHTML =
    `<div><strong>${s.score}</strong><span>คะแนน</span></div><div><strong>${s.accuracy()}%</strong><span>ความแม่นยำ</span></div><div><strong>${s.wpm(elapsed)}</strong><span>WPM</span></div>`;
  const weak = Object.entries(s.mistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  $("review").textContent = weak.length
    ? "ปุ่มที่ควรฝึกเพิ่ม: " +
      weak.map(([c, n]) => `${c} (${n} ครั้ง)`).join(" · ")
    : s.hits
      ? "แม่นยำมาก! ลองเพิ่มระดับ หรือปิดตัวช่วยในรอบถัดไป"
      : "ลองเริ่มใหม่ แล้วพิมพ์คำที่ปรากฏบนจอ";
  const record = {
    categoryId: $("level").value === 'home' ? 'home' : $("category").value,
    endedAt: new Date().toISOString(),
    language: $("language").value,
    level: $("level").value,
    category:
      $("level").value === "home"
        ? "แถวเหย้า"
        : $("category").selectedOptions[0].textContent,
    mode,
    seconds: elapsed,
    score: s.score,
    hits: s.hits,
    errors: s.errors,
    targets: s.targets,
    mistakes: s.wordMistakes.map((x) => ({ ...x })),
  };
  historyStore.add(record);
  renderMistakes($("word-review"), record.mistakes);
  $("result-caption").textContent += " · " + record.category;
  $("results").showModal();
  keyboard();
}
function consume(text) {
  if (phase !== "running" || !text) return;
  for (const c of text) {
    if (s.position === s.word.length) break;
    const result = s.type(c);
    $("typing").classList.toggle("wrong", !result.correct);
    $("feedback").textContent = result.correct
      ? "ยอดเยี่ยม! มองจอแล้วพิมพ์ต่อได้เลย"
      : `ลองอีกครั้ง · ปุ่มถัดไปคือ “${s.word[s.position]}”`;
    if (result.complete) {
      animation?.shoot();
      $("flash").classList.remove("fire");
      void $("flash").offsetWidth;
      $("flash").classList.add("fire");
      wordTimer = setTimeout(() => {
        if (phase !== "idle") nextWord();
      }, 280);
    }
  }
  $("typing").value = s.word.slice(0, s.position);
  displayWord();
  stats();
}
$("typing").addEventListener("beforeinput", (e) => {
  if (e.isComposing) return;
  if (e.inputType === "insertText") {
    e.preventDefault();
    consume(e.data);
  } else if (
    e.inputType === "insertFromPaste" ||
    e.inputType.startsWith("delete")
  )
    e.preventDefault();
});
$("typing").addEventListener("compositionend", (e) => {
  consume(e.data);
});
$("typing").addEventListener("input", (e) => {
  if (!e.isComposing) $("typing").value = s.word.slice(0, s.position);
});
$("typing").addEventListener("paste", (e) => e.preventDefault());
$("typing").addEventListener("drop", (e) => e.preventDefault());
$("start").onclick = () => (phase === "idle" ? start() : finish());
$("pause").onclick = pause;
$("again").onclick = () => {
  $("results").close();
  start();
};
$("close-results").onclick = () => $("results").close();
document.querySelectorAll(".mode").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      document
        .querySelectorAll(".mode")
        .forEach((x) => x.classList.toggle("active", x === b));
      showBest();
      stats();
    }),
);
function updateCategory() {
  const home = $("level").value === "home";
  $("category").disabled = home || phase !== "idle";
  $("category-note").textContent = home
    ? "เลือกบทเรียนคำศัพท์ เพื่อเปิดหมวดต่าง ๆ"
    : `${bank().length} คำ · สลับลำดับทุกครั้งที่เล่น`;
  $("target-label").textContent = home
    ? "พร้อมฝึกแถวเหย้าหรือยัง?"
    : `หมวด ${$("category").selectedOptions[0].textContent}`;
}
const categorySelect = $("category");
for (const c of categories) {
  const option = document.createElement("option");
  option.value = c.id;
  option.textContent = `${c.label} · ${c.enLabel}`;
  categorySelect.append(option);
}
["language", "level", "category"].forEach(
  (id) =>
    ($(id).onchange = () => {
      keyboard();
      showBest();
      updateCategory();
    }),
);
$("hints").onchange = keyboard;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && phase !== "idle" && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    pause();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && phase === "running") pause();
});
setInterval(() => {
  const now = performance.now();
  if (phase === "running") {
    elapsed += (now - last) / 1000;
    if (mode === "timed" && elapsed >= 60) {
      elapsed = 60;
      finish();
    }
    stats();
  }
  last = now;
}, 100);
keyboard();
showBest();
updateCategory();
import("./scene.js")
  .then((m) => {
    animation = m.createScene($("scene"));
  })
  .catch(() => {
    $("feedback").textContent =
      "ไม่สามารถเปิดฉาก 3D ได้ แต่ยังฝึกพิมพ์ได้ตามปกติ";
  });

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function renderMistakes(container, mistakes) {
  container.replaceChildren();
  container.append(el("h3", "คำที่พิมพ์ผิด"));
  if (!mistakes.length) {
    container.append(el("p", "ไม่มีคำที่พิมพ์ผิดในรอบนี้"));
    return;
  }
  const groups = new Map();
  for (const m of mistakes) {
    if (!groups.has(m.word)) groups.set(m.word, []);
    groups.get(m.word).push(m);
  }
  for (const [word, items] of groups) {
    const row = el("div", undefined, "mistake-row");
    row.append(el("strong", word), el("span", `ผิด ${items.length} ครั้ง`));
    const pairs = new Map();
    for (const m of items) {
      const label = `ตัวที่ ${m.position + 1}: พิมพ์ “${m.typed}” → ที่ถูก “${m.expected}”`;
      pairs.set(label, (pairs.get(label) || 0) + 1);
    }
    for (const [label, count] of pairs)
      row.append(el("p", label + (count > 1 ? ` (${count} ครั้ง)` : "")));
    container.append(row);
  }
}
function renderHistory() {
  const totals = summarize(history);
  $("history-summary").replaceChildren();
  for (const [value, label] of [
    [history.length, "รอบทั้งหมด"],
    [totals.score, "คะแนนรวม"],
    [totals.targets, "คำที่พิมพ์สำเร็จ"],
    [
      `${Math.floor(totals.seconds / 60)} นาที ${Math.floor(totals.seconds % 60)} วิ`,
      "เวลาฝึกรวม",
    ],
    [`${totals.accuracy}%`, "ความแม่นยำรวม"],
    [totals.wpm, "WPM รวม"],
  ]) {
    const card = el("div");
    card.append(el("strong", String(value)), el("span", label));
    $("history-summary").append(card);
  }
  $("history-list").replaceChildren();
  if (!history.length) {
    $("history-list").append(
      el("p", "ยังไม่มีประวัติ เริ่มภารกิจแรกแล้วกลับมาดูพัฒนาการได้ที่นี่"),
    );
    return;
  }
  for (const r of history) {
    const details = el("details", undefined, "history-round"),
      summary = el("summary");
    summary.append(
      el("strong", r.category),
      el(
        "span",
        `${new Date(r.endedAt).toLocaleString("th-TH")} · ${r.language === "th" ? "ไทย" : "English"} · ${r.mode === "timed" ? "60 วินาที" : "ฝึกสบาย ๆ"}`,
      ),
      el(
        "span",
        `${r.score} คะแนน · ${r.targets} คำ · ${Math.round(r.seconds)} วินาที · ${summarize([r]).accuracy}% · ${summarize([r]).wpm} WPM · ผิด ${r.errors} ครั้ง`,
      ),
    );
    details.append(summary);
    const review = el("div");
    renderMistakes(review, r.mistakes);
    details.append(review);
    $("history-list").append(details);
  }
}
renderHistory();
$("start").disabled = true;
$("sync-history").onclick = () => historyStore.sync();
$("import-history").onclick = () => {
  $("import-caption").textContent = `นำประวัติผู้เยี่ยมชม ${historyStore.guest.length} รอบบนเครื่องนี้เข้าบัญชี ${accountUser?.email || ''}? นำเข้าเฉพาะเมื่อเป็นประวัติของคุณ รอบที่เคยนำเข้าแล้วจะไม่ถูกนับซ้ำ`;
  $("import-dialog").showModal();
};
$("import-cancel").onclick = () => $("import-dialog").close();
$("import-confirm").onclick = () => { $("import-dialog").close(); void historyStore.importGuest(); };
window.addEventListener('online', () => void historyStore.sync());
void initAccount({
  onClient: client => { historyStore.client = client; },
  onReady: () => { authReady = true; $("start").disabled = false; lock(phase !== 'idle'); },
  onUser: user => {
    if (accountUser?.id !== user?.id) {
      if (phase !== 'idle') finish();
      $("results").close(); $("import-dialog").close();
    }
    accountUser = user; historyStore.setUser(user?.id || null); historyStore.notify();
  },
});
