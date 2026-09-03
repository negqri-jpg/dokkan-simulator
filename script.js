"use strict";

function passiveModeFor(text, fallback = 1) {
  if (/足し算/.test(text)) return 1;
  if (/掛け算/.test(text)) return 2;
  if (/復活/.test(text) && !/ターン終了時/.test(text)) return 1;
  if (/攻撃時|攻撃するたび|攻撃する度|攻撃を受け|回避すると|回避するたび|ガードするたび|必殺技を発動するたび|ターン終了時|(?:アクティブ|チャージ|フィニッシュ).*発動|とどめ/.test(text)) return 2;
  if (/基本効果|登場|ターン開始|ターン経過|気玉|チーム|HP|番目|敵を攻撃すると/.test(text)) return 1;
  return fallback;
}

function parsePassive(text) {
  const values = { atk_p1: 0, def_p1: 0, atk_p2: 0, def_p2: 0 };
  const warnings = [];
  let mode = 1;
  let disabled = false;
  let needsTotal = false;
  for (const [index, raw] of String(text || "").split(/\r?\n/).entries()) {
    const line = raw.normalize("NFKC").toUpperCase().replace(/\s/g, "")
      .replace(/【(\d+(?:\.\d+)?)】%?/g, "$1%");
    if (!line) continue;
    const statPattern = /((?:ATK|DEF)(?:(?:\/|と|&|、|及び)(?:ATK|DEF))?)(?:が|を|は)?(\d+(?:\.\d+)?)%(?:UP|上昇)?/g;
    const matches = [...line.matchAll(statPattern)];
    if (!matches.length) {
      if (/ATK|DEF/.test(line)) {
        if (!line.startsWith("-") && !disabled) warnings.push(index + 1);
        continue;
      }
      // Descriptive effect lines must not change the surrounding heading.
      if (/[0-9]/.test(line) && !/HP|気力|気玉|番目|ターン|登場/.test(line)) continue;
      mode = passiveModeFor(line);
      disabled = line.startsWith("-");
      needsTotal = /最大|につき|するたび|する度/.test(line);
      continue;
    }
    if (line.startsWith("-") || disabled) continue;
    const lineMode = passiveModeFor(line, mode);
    if (needsTotal || /最大|につき|するたび|する度|DOWN|低下|減少/.test(line) ||
        /ATK|DEF/.test(line.replace(statPattern, ""))) {
      warnings.push(index + 1);
      // Repeated/capped or decreasing effects need explicit resolved totals.
      continue;
    }
    for (const match of matches) {
      const amount = Number(match[2]);
      if (match[1].includes("ATK")) values["atk_p" + lineMode] += amount;
      if (match[1].includes("DEF")) values["def_p" + lineMode] += amount;
    }
  }
  return { ...values, warnings: [...new Set(warnings)] };
}

function checkedInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("計算結果が扱える数値の範囲を超えました。入力値を小さくしてください。");
  return value;
}

// Ratios use four decimal places: a percentage entered to 0.01% is exact here.
function multiplyStage(value, ratio, final = false) {
  const numerator = BigInt(checkedInteger(value)) * BigInt(Math.round(ratio * 10000));
  return checkedInteger(Number((numerator + (final ? 5000n : 0n)) / 10000n));
}

function calculateBuild(data) {
  function number(key, fallback = 0) {
    const raw = data[key] ?? fallback;
    if (!["number", "string"].includes(typeof raw)) throw new Error(key + " の形式が正しくありません。");
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 1000000) throw new Error(key + " の入力範囲を確認してください。");
    return value;
  }
  const parsed = parsePassive(data.passiveSkill);
  const manual = data.passiveMode === "manual";
  if (!manual && parsed.warnings.length) {
    throw new Error("パッシブの " + parsed.warnings.join("・") + " 行目は自動計算できません。有効な合計倍率に書き換えるか、倍率を直接入力してください。");
  }
  const passive = manual ? {
    atk_p1: number("passive1Atk"), def_p1: number("passive1Def"),
    atk_p2: number("passive2Atk"), def_p2: number("passive2Def")
  } : parsed;
  const allyGroup = data.allyTiming === "2" ? 2 : 1;
  passive["atk_p" + allyGroup] += number("allyAtk");
  passive["def_p" + allyGroup] += number("allyDef");
  const leader = 1 + (number("leaderSkill") + number("friendLeaderSkill")) / 100;
  const stages = { atk: [], def: [] };
  function common(stat) {
    const suffix = stat === "atk" ? "Atk" : "Def";
    let value = checkedInteger(number("base" + suffix));
    for (const [label, ratio] of [
      ["リーダー", leader],
      ["フィールド", 1 + number("field" + suffix) / 100],
      ["メモリー・アイテム", 1 + number("support" + suffix) / 100],
      ["足し算パッシブ", 1 + passive[stat + "_p1"] / 100],
      ["アクティブ", 1 + number("active" + suffix) / 100],
      ["リンク", 1 + number("link" + suffix) / 100]
    ]) {
      value = multiplyStage(value, ratio);
      stages[stat].push({ label, value, ratio });
    }
    return value;
  }
  const baseAtk = common("atk");
  const baseDef = common("def");
  const powerLevel = number("superPowerLv");
  if (!Number.isInteger(powerLevel)) throw new Error("必殺技威力UP Lvは整数で入力してください。");
  const power = powerLevel * 0.05;
  let atkEffect = number("previousAtkEffect");
  let defEffect = number("previousDefEffect");
  const attacks = [];
  const order = data.attackOrder === "normal-first" ? ["normal", "ultra"] : ["ultra", "normal"];
  for (const type of order) {
    const count = number(type + "Count");
    if (!Number.isInteger(count) || count > 20) throw new Error("発動回数は0〜20の整数で入力してください。");
    const ki = number(type === "normal" ? "normalKiBonus" : "kiBonus", type === "normal" ? 1.5 : 2);
    if (ki <= 0 || ki > 10) throw new Error("気力倍率は0より大きく、10以下にしてください。");
    const afterKi = multiplyStage(baseAtk, ki);
    const afterPassive = multiplyStage(afterKi, 1 + passive.atk_p2 / 100);
    function effect(stat) {
      const key = type + stat + "Effect";
      return data[key] === "custom" ? number(type + "Custom" + stat) : number(key);
    }
    for (let index = 0; index < count; index++) {
      atkEffect += effect("Atk");
      defEffect += effect("Def");
      const multiplier = number(type + "Multiplier") + number(type + "Plus") + power + atkEffect / 100;
      attacks.push({
        type, index: index + 1, ki, multiplier,
        atk: multiplyStage(afterPassive, multiplier, true)
      });
    }
  }
  const afterPassiveDef = multiplyStage(baseDef, 1 + passive.def_p2 / 100);
  const resultDef = multiplyStage(afterPassiveDef, 1 + defEffect / 100, true);
  const totalAtk = checkedInteger(attacks.reduce((total, attack) => total + attack.atk, 0));
  return { totalAtk, resultDef, attacks, passive, stages, afterPassiveDef, defEffect };
}

function toggleSuperEffectInput(type, stat) {
  const suffix = stat === "atk" ? "Atk" : "Def";
  const select = document.getElementById(type + suffix + "Effect");
  const input = document.getElementById(type + "Custom" + suffix);
  const custom = select.value === "custom";
  input.classList.toggle("hidden", !custom);
  input.disabled = !custom;
}

function refreshPassiveInputs() {
  const manual = document.getElementById("passiveMode").value === "manual";
  const parsed = parsePassive(document.getElementById("passiveSkill").value);
  for (const group of [1, 2]) {
    for (const stat of ["Atk", "Def"]) {
      const input = document.getElementById("passive" + group + stat);
      input.readOnly = !manual;
      if (!manual) input.value = parsed[stat.toLowerCase() + "_p" + group];
    }
  }
  document.getElementById("passiveWarning").textContent = !manual && parsed.warnings.length
    ? parsed.warnings.join("・") + " 行目の効果は未解析です。倍率の直接入力が必要です。" : "";
}

function formatNumber(value) {
  return value.toLocaleString("ja-JP");
}

let latestResult = null;

function invalidateResult() {
  if (latestResult) document.getElementById("resultStatus").textContent = "条件変更済み・再計算が必要";
}

function updateDurability() {
  const output = document.getElementById("hpResult");
  if (!latestResult) return;
  const input = document.getElementById("damageReduction");
  if (!input.checkValidity()) {
    output.textContent = "軽減率は0〜100%で入力してください。";
    return;
  }
  const reduction = Number(input.value) / 100;
  const guard = document.getElementById("guard").checked;
  const factor = (guard ? 0.8 : 1) * (1 - reduction);
  if (factor === 0) {
    output.textContent = "軽減100%：この近似式での上限なし";
    return;
  }
  const def = latestResult.resultDef;
  const lines = ["完封目安: " + formatNumber(Math.floor(def / factor))];
  for (const hp of [600000, 800000, 1000000]) {
    const line = (def + hp * (guard ? 2 : 1)) / factor;
    lines.push("HP" + (hp / 10000) + "万: " + formatNumber(Math.floor(line)));
  }
  output.textContent = lines.join("\n");
}

function calculate() {
  const form = document.getElementById("calculatorForm");
  const error = document.getElementById("calculationError");
  error.textContent = "";
  if (!form.reportValidity()) return;
  try {
    refreshPassiveInputs();
    const data = {};
    for (const control of form.elements) {
      if (control.id && ["INPUT", "SELECT", "TEXTAREA"].includes(control.tagName)) data[control.id] = control.value;
    }
    latestResult = calculateBuild(data);
    document.getElementById("resultAtk").textContent = formatNumber(latestResult.totalAtk);
    document.getElementById("resultDef").textContent = formatNumber(latestResult.resultDef);
    const lines = latestResult.attacks.map(a => (a.type === "ultra" ? "超必殺 " : "必殺 ") + a.index + "回目: " + formatNumber(a.atk));
    if (!lines.length) lines.push("必殺技の発動なし");
    lines.push("", "パッシブ（味方支援を含む）",
      "ATK: " + latestResult.passive.atk_p1 + "% / " + latestResult.passive.atk_p2 + "%",
      "DEF: " + latestResult.passive.def_p1 + "% / " + latestResult.passive.def_p2 + "%",
      "累積DEF効果: " + latestResult.defEffect + "%");
    document.getElementById("detail").textContent = lines.join("\n");
    document.getElementById("resultStatus").textContent = "計算済み";
    updateDurability();
    if (window.matchMedia("(max-width: 900px)").matches) document.getElementById("results").scrollIntoView({ block: "start" });
  } catch (cause) {
    latestResult = null;
    error.textContent = cause.message;
    document.getElementById("resultStatus").textContent = "入力を確認してください";
    document.getElementById("resultAtk").textContent = "—";
    document.getElementById("resultDef").textContent = "—";
    document.getElementById("detail").textContent = "未計算";
    document.getElementById("hpResult").textContent = "未計算";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("calculatorForm").addEventListener("submit", event => {
    event.preventDefault();
    calculate();
  });
  document.getElementById("calculatorForm").addEventListener("input", invalidateResult);
  for (const type of ["normal", "ultra"]) {
    for (const stat of ["atk", "def"]) {
      const select = document.getElementById(type + (stat === "atk" ? "Atk" : "Def") + "Effect");
      select.addEventListener("change", () => toggleSuperEffectInput(type, stat));
      toggleSuperEffectInput(type, stat);
    }
  }
  document.getElementById("passiveMode").addEventListener("change", refreshPassiveInputs);
  document.getElementById("passiveSkill").addEventListener("input", refreshPassiveInputs);
  document.getElementById("damageReduction").addEventListener("input", updateDurability);
  document.getElementById("guard").addEventListener("change", updateDurability);
  refreshPassiveInputs();
});
