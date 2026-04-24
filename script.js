// =========================
// キーワード
// =========================
const passive1Keywords = [
  "基本効果","登場時","復活","番目","登場から","バトル開始",
  "ターン開始","ターン経過","気玉","チーム","残りHP",
  "敵が","敵の","自身の他に","攻撃参加中","自身を除く","気玉取得時"
];

const passive2Keywords = [
  "攻撃時","受ける","受けるたび",
  "回避","回避するたび",
  "ターン終了時",
  "発動時","発動している",
  "攻撃するたび",
  "とどめ"
];

// =========================
// パッシブ解析（完全安定版）
// =========================
function parsePassive(text) {
  if (!text || text.trim() === "") {
    return { atk_p1: 0, atk_p2: 0, def_p1: 0, def_p2: 0 };
  }

  const lines = text.split("\n");

  let atk_p1 = 0, atk_p2 = 0;
  let def_p1 = 0, def_p2 = 0;

  let currentMode = 1;
  let disabledMode = null;

  lines.forEach(line => {
    let raw = line.trim();
    if (!raw) return;

    // 🔥 全角スペースも削除
    let t = raw.replace(/[\s　]/g, "");

    const isHeader = !t.includes("【");

    // =========================
    // 見出し処理
    // =========================
    if (isHeader) {
      if (passive2Keywords.some(k => t.includes(k))) {
        currentMode = 2;
      } else if (passive1Keywords.some(k => t.includes(k))) {
        currentMode = 1;
      }

      if (t.startsWith("-")) {
        disabledMode = currentMode;
      } else if (disabledMode === currentMode) {
        disabledMode = null;
      }

      return;
    }

    // =========================
    // 行単位無効
    // =========================
    if (t.startsWith("-")) return;

    // =========================
    // モード判定（ここが重要）
    // =========================
    let mode = currentMode;

    if (passive2Keywords.some(k => t.includes(k))) {
      mode = 2;
    } else if (passive1Keywords.some(k => t.includes(k))) {
      mode = 1;
    }

    currentMode = mode;

    if (disabledMode === mode) return;

    // =========================
    // 数値抽出
    // =========================
    const matches = [...t.matchAll(/【(\d+)】/g)];
    const total = matches.reduce((s, m) => s + Number(m[1]), 0);
    if (!total) return;

    // =========================
    // ATK/DEF判定（安定版）
    // =========================
    const hasATK = t.includes("ATK");
    const hasDEF = t.includes("DEF");

    // 両方ない場合は無視
    if (!hasATK && !hasDEF) return;

    if (mode === 2) {
      if (hasATK) atk_p2 += total;
      if (hasDEF) def_p2 += total;
    } else {
      if (hasATK) atk_p1 += total;
      if (hasDEF) def_p1 += total;
    }
  });

  return { atk_p1, atk_p2, def_p1, def_p2 };
}

// =========================
// 必殺効果UI
// =========================
function toggleSuperEffectInput(type) {
  const select = document.getElementById(
    type === "atk" ? "superEffectSelectAtk" : "superEffectSelectDef"
  );
  const input = document.getElementById(
    type === "atk" ? "superEffectCustomAtk" : "superEffectCustomDef"
  );

  input.style.display = select.value === "custom" ? "block" : "none";
}

function getSuperEffectAtk() {
  const v = document.getElementById("superEffectSelectAtk").value;
  if (v === "custom") {
    return Number(document.getElementById("superEffectCustomAtk").value) || 0;
  }
  return Number(v) || 0;
}

function getSuperEffectDef() {
  const v = document.getElementById("superEffectSelectDef").value;
  if (v === "custom") {
    return Number(document.getElementById("superEffectCustomDef").value) || 0;
  }
  return Number(v) || 0;
}

// =========================
// 表示
// =========================
function formatNumber(num) {
  return num.toLocaleString();
}

function formatJapanese(num) {
  const units = [
    { value: 1e16, label: "京" },
    { value: 1e12, label: "兆" },
    { value: 1e8, label: "億" },
    { value: 1e4, label: "万" }
  ];

  let result = "";
  let remaining = Math.floor(num / 10000) * 10000;

  for (const u of units) {
    if (remaining >= u.value) {
      const n = Math.floor(remaining / u.value);
      remaining %= u.value;
      result += n + u.label;
    }
  }

  return result || "0";
}

// =========================
// 計算
// =========================
function calculate() {

  const baseAtk = Number(document.getElementById("baseAtk").value) || 0;
  const baseDef = Number(document.getElementById("baseDef").value) || 0;

  const leader = (Number(document.getElementById("leaderSkill").value) || 0)
               + (Number(document.getElementById("friendLeaderSkill").value) || 0);

  const totalLeader = leader / 100;

  // ATK
  const fieldAtk = Number(document.getElementById("fieldAtk").value) / 100 || 0;
  const supportAtk = Number(document.getElementById("supportAtk").value) / 100 || 0;
  const activeAtk = Number(document.getElementById("activeAtk").value) / 100 || 0;
  const linkAtk = Number(document.getElementById("linkAtk").value) / 100 || 0;

  // DEF
  const fieldDef = Number(document.getElementById("fieldDef").value) / 100 || 0;
  const supportDef = Number(document.getElementById("supportDef").value) / 100 || 0;
  const activeDef = Number(document.getElementById("activeDef").value) / 100 || 0;
  const linkDef = Number(document.getElementById("linkDef").value) / 100 || 0;

  const kiBonus = Number(document.getElementById("kiBonus").value) || 1;

  const superMultiplier = Number(document.getElementById("superMultiplier").value) || 1;
  const plusSuper = Number(document.getElementById("plussuperMultiplier").value) || 0;

  const stack = Number(document.getElementById("superStack").value) || 1;

  const superAtk = (getSuperEffectAtk() / 100) * stack;
  const superDef = (getSuperEffectDef() / 100) * stack;

  const totalSuper = superMultiplier + plusSuper + superAtk;

  const passive = parsePassive(document.getElementById("passiveSkill").value);

  const atk_p1 = passive.atk_p1 / 100;
  const atk_p2 = passive.atk_p2 / 100;

  const def_p1 = passive.def_p1 / 100;
  const def_p2 = passive.def_p2 / 100;

  const resultAtk =
    baseAtk *
    (1 + totalLeader) *
    (1 + fieldAtk) *
    (1 + atk_p1) *
    (1 + atk_p2) *
    (1 + supportAtk) *
    (1 + activeAtk) *
    (1 + linkAtk) *
    kiBonus *
    totalSuper;

  const resultDef =
    baseDef *
    (1 + totalLeader) *
    (1 + fieldDef) *
    (1 + def_p1) *
    (1 + def_p2) *
    (1 + supportDef) *
    (1 + activeDef) *
    (1 + linkDef) *
    (1 + superDef);

  // =========================
  // 耐久計算
  // =========================

  const reduction = (Number(document.getElementById("damageReduction").value) || 0) / 100;
  const guard = document.getElementById("guard").checked;

  function calcPerfectLine() {
    if (!guard && reduction === 0) return resultDef;
    if (!guard) return resultDef / (1 - reduction);
    if (guard && reduction === 0) return (resultDef * 0.5) / 0.8;
    return (resultDef * 0.5) / (0.8 * (1 - reduction));
  }

  function calcLimitLine(hp) {
    if (!guard && reduction === 0) return resultDef + hp;
    if (!guard) return (resultDef + hp) / (1 - reduction);
    if (guard && reduction === 0) return (hp + resultDef * 0.5) / 0.8;
    return (hp + resultDef * 0.5) / (0.8 * (1 - reduction));
  }

  const perfect = Math.floor(calcPerfectLine());
  const hp600 = Math.floor(calcLimitLine(600000));
  const hp800 = Math.floor(calcLimitLine(800000));
  const hp1000 = Math.floor(calcLimitLine(1000000));

  document.getElementById("hpResult").innerText =
`完封ライン: ${formatNumber(perfect)}

HP60万: ${formatNumber(hp600)}
HP80万: ${formatNumber(hp800)}
HP100万: ${formatNumber(hp1000)}`;

  // =========================
  // 表示
  // =========================

  document.getElementById("resultAtk").innerText = formatNumber(Math.floor(resultAtk));
  document.getElementById("resultDef").innerText = formatNumber(Math.floor(resultDef));

  document.getElementById("detail").innerText =
`最終ATK: 約${formatJapanese(resultAtk)}
最終DEF: 約${formatJapanese(resultDef)}

【ATK】
足し算パッシブ: ${passive.atk_p1}%
掛け算パッシブ: ${passive.atk_p2}%

【DEF】
足し算パッシブ: ${passive.def_p1}%
掛け算パッシブ: ${passive.def_p2}%`;

console.log(passive);
}