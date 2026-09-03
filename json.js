"use strict";

const formFields = [
  "nickname", "charName", "baseAtk", "baseDef", "superPowerLv",
  "leaderSkill", "friendLeaderSkill", "fieldAtk", "fieldDef",
  "supportAtk", "supportDef", "activeAtk", "activeDef", "linkAtk", "linkDef",
  "allyAtk", "allyDef", "allyTiming", "kiBonus", "normalKiBonus",
  "normalMultiplier", "normalCount", "normalAtkEffect", "normalCustomAtk",
  "normalDefEffect", "normalCustomDef", "normalPlus",
  "ultraMultiplier", "ultraCount", "ultraAtkEffect", "ultraCustomAtk",
  "ultraDefEffect", "ultraCustomDef", "ultraPlus", "attackOrder",
  "previousAtkEffect", "previousDefEffect", "passiveSkill", "passiveMode",
  "passive1Atk", "passive1Def", "passive2Atk", "passive2Def", "damageReduction"
];
const legacyMap = {
  charName: "name", normalMultiplier: "superMultiplier",
  normalCount: "superStack", normalAtkEffect: "superEffectAtk",
  normalCustomAtk: "superEffectAtkCustom", normalDefEffect: "superEffectDef",
  normalCustomDef: "superEffectDefCustom", normalPlus: "plussuperMultiplier",
  passiveSkill: "passive"
};

function getValue(id) {
  return document.getElementById(id).value;
}

function getSaveData() {
  const data = { schemaVersion: 2 };
  for (const id of formFields) data[id] = getValue(id);
  data.name = data.charName;
  data.passive = data.passiveSkill;
  data.guard = document.getElementById("guard").checked;
  return data;
}

function fileStatus(message, error = false) {
  const status = document.getElementById("fileStatus");
  status.textContent = message;
  status.classList.toggle("error", error);
}

function refreshCustomEffectInputs() {
  for (const type of ["normal", "ultra"]) {
    for (const stat of ["atk", "def"]) toggleSuperEffectInput(type, stat);
  }
}

function saveToFile() {
  const data = getSaveData();
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const name = (data.nickname || data.name || "dokkan_build")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 80) || "dokkan_build";
  const link = document.createElement("a");
  link.href = url;
  link.download = name + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  fileStatus("JSONを保存しました。");
}

function loadData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("JSONの形式が正しくありません。");
  if (!["baseAtk", "baseDef", "nickname", "passive", "passiveSkill"].some(key => Object.hasOwn(data, key))) {
    throw new Error("キャラクターデータを含むJSONを選択してください。");
  }
  const values = {};
  for (const id of formFields) {
    const element = document.getElementById(id);
    const key = Object.hasOwn(data, id) ? id : legacyMap[id];
    let raw = key && Object.hasOwn(data, key) ? data[key] : undefined;
    if (id === "normalKiBonus" && raw === undefined && Object.hasOwn(data, "kiBonus")) raw = data.kiBonus;
    if (raw === undefined) {
      raw = element.tagName === "SELECT"
        ? ([...element.options].find(option => option.defaultSelected) || element.options[0]).value
        : element.defaultValue;
    }
    if (!["string", "number"].includes(typeof raw)) throw new Error(id + " の形式が正しくありません。");
    const value = String(raw);
    if (element.type === "number" && value !== "") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < Number(element.min || 0) ||
          number > Number(element.max || 1000000)) throw new Error(id + " の数値が範囲外です。");
      const step = Number(element.step || 1);
      if (Math.abs(number / step - Math.round(number / step)) > 0.000001) throw new Error(id + " の小数桁または回数を確認してください。");
    }
    if (element.tagName === "SELECT" && ![...element.options].some(option => option.value === value)) {
      throw new Error(id + " の選択値が正しくありません。");
    }
    if (element.maxLength > 0 && value.length > element.maxLength) throw new Error(id + " が長すぎます。");
    values[id] = value;
  }
  if (Object.hasOwn(data, "guard") && typeof data.guard !== "boolean") throw new Error("guard は true または false にしてください。");
  // Commit only after every field has passed validation.
  for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value;
  document.getElementById("guard").checked = data.guard === true;
  refreshCustomEffectInputs();
  refreshPassiveInputs();
  invalidateResult();
  document.getElementById("calculationError").textContent = "";
  fileStatus(data.schemaVersion === 2 ? "読み込みました。" :
    "旧形式を読み込みました。従来のサポート欄はメモリー・アイテムとして保持しています。味方支援と各必殺技の気力倍率をご確認ください。");
}

let loadRequest = 0;
async function loadFromFile(file) {
  if (!file) return;
  const request = ++loadRequest;
  try {
    if (file.size > 1024 * 1024) throw new Error("JSONファイルは1MB以下にしてください。");
    const contents = await file.text();
    if (request !== loadRequest) return;
    loadData(JSON.parse(contents));
    document.getElementById("fileName").textContent = file.name;
  } catch (cause) {
    if (request === loadRequest) fileStatus("読み込み失敗: " + cause.message, true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveButton").addEventListener("click", saveToFile);
  document.getElementById("loadButton").addEventListener("click", () => document.getElementById("fileLoader").click());
  document.getElementById("fileLoader").addEventListener("change", function () {
    loadFromFile(this.files[0]);
    this.value = "";
  });
});
