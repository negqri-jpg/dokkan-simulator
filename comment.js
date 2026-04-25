import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "dokkan-comment.firebaseapp.com",
  projectId: "dokkan-comment",
  storageBucket: "dokkan-comment.firebasestorage.app",
  messagingSenderId: "598573061096",
  appId: "1:598573061096:web:3c41dad20fc67aba55ca5d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COMMENT_MAX_LENGTH = 200;
const NAME_MAX_LENGTH = 24;
const NG_WORD_MAX_LENGTH = 40;
const POST_INTERVAL_MS = 3000;

let liked = new Set(readStoredArray("liked"));
let myNG = readStoredArray("myNG");
let ngIds = new Set(readStoredArray("ngIds"));
let currentSort = "time";
let unsubscribe;
let lastPostTime = 0;
let userId = normalizeSingleLine(localStorage.getItem("userId"));

if (!userId) {
  userId = Math.random().toString(36).slice(2, 10);
  localStorage.setItem("userId", userId);
}

const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const listBox = document.getElementById("list");
const ngInput = document.getElementById("ngInput");
const ngList = document.getElementById("ngList");
const ngIdList = document.getElementById("ngIdList");

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoredArray(key, value) {
  localStorage.setItem(key, JSON.stringify([...value]));
}

function normalizeSingleLine(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function normalizeComment(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function getRandomName() {
  const list = [
    "地球人",
    "フリーザ兵",
    "ナメック星人",
    "界王神界の見習い",
    "サイヤ人の生き残り"
  ];
  return list[Math.floor(Math.random() * list.length)];
}

function setupInitialName() {
  const savedName = normalizeSingleLine(localStorage.getItem("name")).slice(0, NAME_MAX_LENGTH);
  const name = savedName || getRandomName();

  nameInput.value = name;
  localStorage.setItem("name", name);
}

async function postComment() {
  const name = normalizeSingleLine(nameInput.value).slice(0, NAME_MAX_LENGTH) || getRandomName();
  const text = normalizeComment(textInput.value);

  if (!text) return;

  if (text.length > COMMENT_MAX_LENGTH) {
    alert(`コメントは${COMMENT_MAX_LENGTH}文字以内で入力してください`);
    return;
  }

  if (Date.now() - lastPostTime < POST_INTERVAL_MS) {
    alert("連続投稿は3秒空けてください");
    return;
  }

  lastPostTime = Date.now();

  try {
    await addDoc(collection(db, "comments"), {
      name,
      text,
      time: Date.now(),
      likes: 0,
      userId
    });

    localStorage.setItem("name", name);
    nameInput.value = name;
    textInput.value = "";
  } catch (error) {
    lastPostTime = 0;
    console.error(error);
    alert("投稿に失敗しました");
  }
}

function rerollName() {
  const random = getRandomName();
  nameInput.value = random;
  localStorage.setItem("name", random);
}

function addMyNG() {
  const word = normalizeSingleLine(ngInput.value).slice(0, NG_WORD_MAX_LENGTH);
  if (!word) return;

  const exists = myNG.some(item => item.toLowerCase() === word.toLowerCase());
  if (!exists) {
    myNG.push(word);
    writeStoredArray("myNG", myNG);
  }

  ngInput.value = "";
  renderNG();
  render();
}

async function likeComment(id) {
  const ref = doc(db, "comments", id);
  const wasLiked = liked.has(id);

  if (wasLiked) {
    liked.delete(id);
  } else {
    liked.add(id);
  }

  writeStoredArray("liked", liked);

  try {
    await updateDoc(ref, { likes: increment(wasLiked ? -1 : 1) });
  } catch (error) {
    if (wasLiked) {
      liked.add(id);
    } else {
      liked.delete(id);
    }
    writeStoredArray("liked", liked);
    console.error(error);
    alert("いいねの更新に失敗しました");
  }
}

function getQuery() {
  return currentSort === "likes"
    ? query(collection(db, "comments"), orderBy("likes", "desc"))
    : query(collection(db, "comments"), orderBy("time", "desc"));
}

function shouldHideComment(text, commentUserId) {
  const textLower = text.toLowerCase();
  return myNG.some(word => textLower.includes(word.toLowerCase())) || ngIds.has(commentUserId);
}

function createCommentElement(id, data) {
  const commentUserId = normalizeSingleLine(data.userId);
  const text = normalizeComment(data.text);
  const name = normalizeSingleLine(data.name).slice(0, NAME_MAX_LENGTH) || "匿名";
  const likes = Math.max(0, Number(data.likes) || 0);
  const isMine = commentUserId === userId;
  const isLiked = liked.has(id);

  const item = document.createElement("div");
  item.className = "comment";
  if (isMine) item.classList.add("mine");

  const textElement = document.createElement("div");
  textElement.className = "text";
  textElement.textContent = text;

  const timeElement = document.createElement("div");
  timeElement.className = "time";
  timeElement.textContent = formatTime(data.time);

  const nameElement = document.createElement("div");
  nameElement.className = "name";
  nameElement.textContent = `${name} (ID:${commentUserId.slice(0, 5) || "-----"})${isMine ? " (自分)" : ""}`;

  const actions = document.createElement("div");
  actions.className = "comment-actions";

  const likeButton = document.createElement("button");
  likeButton.type = "button";
  likeButton.className = "like";
  likeButton.classList.toggle("liked", isLiked);
  likeButton.textContent = `👍 ${likes}`;
  likeButton.addEventListener("click", () => likeComment(id));

  const ngButton = document.createElement("button");
  ngButton.type = "button";
  ngButton.className = "ng-id-button";
  ngButton.textContent = "NG";
  ngButton.addEventListener("click", () => addNGId(commentUserId));

  actions.append(likeButton, ngButton);
  item.append(textElement, timeElement, nameElement, actions);

  return item;
}

function render() {
  const q = getQuery();
  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(q, (snapshot) => {
    const fragment = document.createDocumentFragment();

    snapshot.forEach(docSnap => {
      const data = docSnap.data() || {};
      const commentUserId = normalizeSingleLine(data.userId);
      const text = normalizeComment(data.text);

      if (!text || shouldHideComment(text, commentUserId)) return;
      fragment.append(createCommentElement(docSnap.id, data));
    });

    listBox.replaceChildren(fragment);
  }, (error) => {
    console.error(error);
    listBox.textContent = "コメントの取得に失敗しました";
  });
}

function setSort(type) {
  if (!["time", "likes"].includes(type)) return;

  currentSort = type;
  document.querySelectorAll("[data-sort]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.sort === currentSort);
  });
  render();
}

function formatTime(value) {
  const d = new Date(Number(value));
  if (Number.isNaN(d.getTime())) return "-";

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");

  return `${d.getFullYear()}/${month}/${day} ${hour}:${minute}`;
}

function renderNG() {
  const wordFragment = document.createDocumentFragment();

  myNG.forEach((word, index) => {
    const item = document.createElement("div");
    item.className = "ng-item";

    const label = document.createElement("span");
    label.textContent = word;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "削除";
    button.addEventListener("click", () => removeNG(index));

    item.append(label, button);
    wordFragment.append(item);
  });

  ngList.replaceChildren(wordFragment);

  const idFragment = document.createDocumentFragment();

  [...ngIds].forEach((id, index) => {
    const item = document.createElement("div");
    item.className = "ng-item";

    const label = document.createElement("span");
    label.textContent = `ID: ${id}`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "削除";
    button.addEventListener("click", () => removeNGId(index));

    item.append(label, button);
    idFragment.append(item);
  });

  ngIdList.replaceChildren(idFragment);
}

function removeNG(index) {
  myNG.splice(index, 1);
  writeStoredArray("myNG", myNG);
  renderNG();
  render();
}

function addNGId(id) {
  const safeId = normalizeSingleLine(id);
  if (!safeId || ngIds.has(safeId)) return;

  ngIds.add(safeId);
  writeStoredArray("ngIds", ngIds);
  renderNG();
  render();
}

function removeNGId(index) {
  const ids = [...ngIds];
  ids.splice(index, 1);
  ngIds = new Set(ids);
  writeStoredArray("ngIds", ngIds);
  renderNG();
  render();
}

setupInitialName();
renderNG();
setSort(currentSort);

document.querySelectorAll("[data-sort]").forEach(button => {
  button.addEventListener("click", () => setSort(button.dataset.sort));
});

document.getElementById("postButton")?.addEventListener("click", postComment);
document.getElementById("rerollButton")?.addEventListener("click", rerollName);
document.getElementById("addNgButton")?.addEventListener("click", addMyNG);
