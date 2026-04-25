const formFields = [
  "nickname",
  "charName",
  "baseAtk",
  "baseDef",
  "superPowerLv",
  "leaderSkill",
  "friendLeaderSkill",
  "fieldAtk",
  "fieldDef",
  "supportAtk",
  "supportDef",
  "activeAtk",
  "activeDef",
  "linkAtk",
  "linkDef",
  "kiBonus",
  "normalMultiplier",
  "normalCount",
  "normalAtkEffect",
  "normalCustomAtk",
  "normalDefEffect",
  "normalCustomDef",
  "normalPlus",
  "ultraMultiplier",
  "ultraCount",
  "ultraAtkEffect",
  "ultraCustomAtk",
  "ultraDefEffect",
  "ultraCustomDef",
  "ultraPlus",
  "passiveSkill",
  "damageReduction"
];

function getValue(id) {
  return document.getElementById(id)?.value ?? "";
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (!element || value === undefined || value === null) return;
  element.value = value;
}

function getSaveData() {
  const data = {};

  formFields.forEach(id => {
    data[id] = getValue(id);
  });

  data.name = data.charName;
  data.passive = data.passiveSkill;
  data.guard = document.getElementById("guard")?.checked ?? false;

  return data;
}

function getLegacyValue(data, id) {
  const legacyMap = {
    charName: ["name"],
    normalMultiplier: ["superMultiplier"],
    normalCount: ["superStack"],
    normalAtkEffect: ["superEffectAtk"],
    normalCustomAtk: ["superEffectAtkCustom"],
    normalDefEffect: ["superEffectDef"],
    normalCustomDef: ["superEffectDefCustom"],
    normalPlus: ["plussuperMultiplier"],
    passiveSkill: ["passive"]
  };

  if (data[id] !== undefined) return data[id];

  const legacyKeys = legacyMap[id] || [];
  for (const key of legacyKeys) {
    if (data[key] !== undefined) return data[key];
  }

  return undefined;
}

function refreshCustomEffectInputs() {
  if (typeof toggleSuperEffectInput !== "function") return;

  ["normal", "ultra"].forEach(type => {
    ["atk", "def"].forEach(stat => toggleSuperEffectInput(type, stat));
  });
}

function saveToFile() {
  const data = getSaveData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const safeName = String(data.nickname || data.name || "dokkan_build")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim()
    .slice(0, 60) || "dokkan_build";

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("JSONの形式が正しくありません");
  }

  formFields.forEach(id => {
    const value = getLegacyValue(data, id);
    if (value !== undefined) setValue(id, value);
  });

  document.getElementById("guard").checked = Boolean(data.guard);
  refreshCustomEffectInputs();
}

function loadFromFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      loadData(JSON.parse(e.target.result));
    } catch (error) {
      alert(error.message || "JSONの読み込みに失敗しました");
    }
  };

  reader.onerror = function () {
    alert("ファイルの読み込みに失敗しました");
  };

  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveButton")?.addEventListener("click", saveToFile);

  document.getElementById("fileLoader")?.addEventListener("change", function () {
    const file = this.files[0];
    document.getElementById("fileName").textContent = file ? file.name : "未選択";
    loadFromFile(file);
  });
});
