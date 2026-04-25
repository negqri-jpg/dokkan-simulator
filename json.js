function saveToFile() {
  const data = {
    nickname: document.getElementById("nickname").value,
    name: document.getElementById("charName").value,

    baseAtk: document.getElementById("baseAtk").value,
    baseDef: document.getElementById("baseDef").value,

    leaderSkill: document.getElementById("leaderSkill").value,
    friendLeaderSkill: document.getElementById("friendLeaderSkill").value,

    fieldAtk: document.getElementById("fieldAtk").value,
    fieldDef: document.getElementById("fieldDef").value,
    supportAtk: document.getElementById("supportAtk").value,
    supportDef: document.getElementById("supportDef").value,
    activeAtk: document.getElementById("activeAtk").value,
    activeDef: document.getElementById("activeDef").value,
    linkAtk: document.getElementById("linkAtk").value,
    linkDef: document.getElementById("linkDef").value,

    kiBonus: document.getElementById("kiBonus").value,

    // 必殺
    normalMultiplier: document.getElementById("normalMultiplier").value,
    normalCount: document.getElementById("normalCount").value,
    normalAtkEffect: document.getElementById("normalAtkEffect").value,
    normalDefEffect: document.getElementById("normalDefEffect").value,
    normalPlus: document.getElementById("normalPlus").value,

    // 超必殺
    ultraMultiplier: document.getElementById("ultraMultiplier").value,
    ultraCount: document.getElementById("ultraCount").value,
    ultraAtkEffect: document.getElementById("ultraAtkEffect").value,
    ultraDefEffect: document.getElementById("ultraDefEffect").value,
    ultraPlus: document.getElementById("ultraPlus").value,

    passive: document.getElementById("passiveSkill").value,

    damageReduction: document.getElementById("damageReduction").value,
    guard: document.getElementById("guard").checked
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${data.nickname || "dokkan_build"}.json`;
  a.click();
}

function loadFromFile() {
  const file = document.getElementById("fileLoader").files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = JSON.parse(e.target.result);

    document.getElementById("nickname").value = data.nickname || "";
    document.getElementById("charName").value = data.name || "";

    document.getElementById("baseAtk").value = data.baseAtk || "";
    document.getElementById("baseDef").value = data.baseDef || "";

    document.getElementById("leaderSkill").value = data.leaderSkill || "";
    document.getElementById("friendLeaderSkill").value = data.friendLeaderSkill || "";

    document.getElementById("fieldAtk").value = data.fieldAtk || "";
    document.getElementById("fieldDef").value = data.fieldDef || "";
    document.getElementById("supportAtk").value = data.supportAtk || "";
    document.getElementById("supportDef").value = data.supportDef || "";
    document.getElementById("activeAtk").value = data.activeAtk || "";
    document.getElementById("activeDef").value = data.activeDef || "";
    document.getElementById("linkAtk").value = data.linkAtk || "";
    document.getElementById("linkDef").value = data.linkDef || "";

    document.getElementById("kiBonus").value = data.kiBonus || "1.5";

    document.getElementById("normalMultiplier").value = data.normalMultiplier || "";
    document.getElementById("normalCount").value = data.normalCount || "0";
    document.getElementById("normalAtkEffect").value = data.normalAtkEffect || "0";
    document.getElementById("normalDefEffect").value = data.normalDefEffect || "0";
    document.getElementById("normalPlus").value = data.normalPlus || "0";

    document.getElementById("ultraMultiplier").value = data.ultraMultiplier || "";
    document.getElementById("ultraCount").value = data.ultraCount || "0";
    document.getElementById("ultraAtkEffect").value = data.ultraAtkEffect || "0";
    document.getElementById("ultraDefEffect").value = data.ultraDefEffect || "0";
    document.getElementById("ultraPlus").value = data.ultraPlus || "0";
    
    document.getElementById("passiveSkill").value = data.passive || "";

    document.getElementById("damageReduction").value = data.damageReduction || "0";
    document.getElementById("guard").checked = data.guard || false;
  };

  reader.readAsText(file);
}

document.getElementById("fileLoader").addEventListener("change", function () {
  const file = this.files[0];
  document.getElementById("fileName").textContent =
    file ? file.name : "未選択";
});