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

// 状態
let liked = JSON.parse(localStorage.getItem("liked") || "[]");
let myName = localStorage.getItem("name") || "";
let currentSort = "time";
let myNG = JSON.parse(localStorage.getItem("myNG") || "[]");
let unsubscribe;
let userId = localStorage.getItem("userId");
let ngIds = JSON.parse(localStorage.getItem("ngIds") || "[]");
let lastPostTime = 0;

if (!userId) {
  userId = Math.random().toString(36).slice(2, 10);
  localStorage.setItem("userId", userId);
}

// 入力
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");

// ランダム名
function getRandomName() {
  const list = [
    "地球人","フリーザ兵","ナメック星人",
    "界王神界の見習い","サイヤ人の生き残り"
  ];
  return list[Math.floor(Math.random() * list.length)];
}

// 初期名前
const savedName = localStorage.getItem("name");
if (savedName) {
  nameInput.value = savedName;
} else {
  const random = getRandomName();
  nameInput.value = random;
  localStorage.setItem("name", random);
}

// 投稿
window.postComment = async function () {
  const name = nameInput.value || getRandomName();
  const text = textInput.value;
  if (!text) return;

   if (Date.now() - lastPostTime < 3000) {
    alert("連続投稿は3秒空けてください");
    return;
  }

  lastPostTime = Date.now();

  if (text.length > 200) {
    alert("長すぎる");
    return;
  }

  if (!text.trim()) return;

  await addDoc(collection(db, "comments"), {
    name,
    text,
    time: Date.now(),
    likes: 0,
    userId: userId
  });

  localStorage.setItem("name", name);
  myName = name;
  textInput.value = "";
};

// 再抽選
window.rerollName = function () {
  const random = getRandomName();
  nameInput.value = random;
  localStorage.setItem("name", random);
  myName = random;
};

window.addMyNG = function() {
  const input = document.getElementById("ngInput");
  const word = input.value.trim();

  if (!word) return;

  myNG.push(word);
  localStorage.setItem("myNG", JSON.stringify(myNG));

  input.value = ""; // 入力欄クリア

  renderNG();
  render();
};

// 👍 ON/OFF
window.likeComment = async function(id) {
  const ref = doc(db, "comments", id);

  if (liked.includes(id)) {
    liked = liked.filter(x => x !== id);
    await updateDoc(ref, { likes: increment(-1) });
  } else {
    liked.push(id);
    await updateDoc(ref, { likes: increment(1) });
  }

  localStorage.setItem("liked", JSON.stringify(liked));
};

// ソート
function getQuery() {
  return currentSort === "likes"
    ? query(collection(db, "comments"), orderBy("likes", "desc"))
    : query(collection(db, "comments"), orderBy("time", "desc"));
}

// 描画
function render() {
  const q = getQuery();
  if (unsubscribe) unsubscribe(); // ←これ追加

  unsubscribe = onSnapshot(q, (snapshot) => {
    const list = document.getElementById("list");
    list.innerHTML = "";

    snapshot.forEach(doc => {
      const c = doc.data();
      const textLower = c.text.toLowerCase();
      
      if (myNG.some(word => textLower.includes(word.toLowerCase()))) return;
      if (ngIds.includes(c.userId)) return;

      const isLiked = liked.includes(doc.id);
      const isMine = c.userId === userId;

      list.innerHTML += `
        <div class="comment ${isMine ? "mine" : ""}">
          <div class="text">${c.text}</div>
          <div class="time">${formatTime(c.time)}</div>
          <div class="name">
            ${c.name} (ID:${c.userId.slice(0,5)}) ${isMine ? "(自分)" : ""}
          </div>

          <div class="like ${isLiked ? "liked" : ""}"
               onclick="likeComment('${doc.id}')">
            👍 ${c.likes || 0}
          </div>

          <button onclick="addNGId('${c.userId}')">NG</button>
        </div>
      `;
    });
  });
}

render();

window.setSort = function(type) {
  currentSort = type;
  render();
};

// 時間
function formatTime(t) {
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
}

function renderNG() {
  const wordBox = document.getElementById("ngList");
  wordBox.innerHTML = "";

  myNG.forEach((word, index) => {
    wordBox.innerHTML += `
      <div class="ng-item">
        <span>${word}</span>
        <button onclick="removeNG(${index})">削除</button>
      </div>
    `;
  });

  const idBox = document.getElementById("ngIdList");
  if (!idBox) return;

  idBox.innerHTML = "";

  ngIds.forEach((id, index) => {
    idBox.innerHTML += `
      <div class="ng-item">
        ID: ${id}
        <button onclick="removeNGId(${index})">削除</button>
      </div>
    `;
  });
}

window.removeNG = function(index) {
  myNG.splice(index, 1);
  localStorage.setItem("myNG", JSON.stringify(myNG));
  render(); // 再描画
  renderNG();
};

window.addNGId = function(id) {
  if (ngIds.includes(id)) return;

  ngIds.push(id);
  localStorage.setItem("ngIds", JSON.stringify(ngIds));

  render();
};

window.removeNGId = function(index) {
  ngIds.splice(index, 1);
  localStorage.setItem("ngIds", JSON.stringify(ngIds));
  render();
  renderNGId();
};