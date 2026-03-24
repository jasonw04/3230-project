const STORAGE_KEY = "mathpals_app";

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  profiles: [
    { id: 1, name: "John", stars: 0, attempts: [] },
    { id: 2, name: "Sam", stars: 0, attempts: [] },
    { id: 3, name: "Emily", stars: 0, attempts: [] }
  ],
  currentProfile: 1,
  currentProblem: null
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getProfile() {
  return state.profiles.find(p => p.id === state.currentProfile);
}

function selectProfile(id) {
  state.currentProfile = id;
  save();
  window.location = "home.html";
}

function generateProblem() {
  let a = Math.floor(Math.random() * 10) + 1;
  let b = Math.floor(Math.random() * 10) + 1;
  let op = Math.random() > 0.5 ? "+" : "-";

  if (op === "-" && b > a) [a, b] = [b, a];

  let answer = op === "+" ? a + b : a - b;

  let choices = [answer];
  while (choices.length < 3) {
    let rand = answer + Math.floor(Math.random() * 5 - 2);
    if (!choices.includes(rand) && rand >= 0) choices.push(rand);
  }

  state.currentProblem = { a, b, op, answer, choices };
  save();
}

function renderProblem() {
  let p = state.currentProblem;
  if (!p) return;

  document.getElementById("problemText").innerText = `${p.a} ${p.op} ${p.b}`;

  let apples = document.getElementById("appleWrap");
  apples.innerHTML = "";

  if (p.op === "+") {
    for (let i = 0; i < p.a; i++) apples.innerHTML += `<div class="apple normal">🍎</div>`;
    for (let i = 0; i < p.b; i++) apples.innerHTML += `<div class="apple add">🍎</div>`;
  } else {
    for (let i = 0; i < p.a - p.b; i++) apples.innerHTML += `<div class="apple normal">🍎</div>`;
    for (let i = 0; i < p.b; i++) apples.innerHTML += `<div class="apple eaten">🍎</div>`;
  }

  let answers = document.getElementById("answerButtons");
  answers.innerHTML = "";

  p.choices.forEach(c => {
    answers.innerHTML += `<button class="answer-btn" onclick="checkAnswer(${c})">${c}</button>`;
  });
}

function checkAnswer(choice) {
  let p = state.currentProblem;
  let profile = getProfile();

  let correct = choice === p.answer;
  profile.attempts.push(correct);

  if (correct) profile.stars++;

  save();
  showResult(correct);
}

function showResult(correct) {
  let modal = new bootstrap.Modal(document.getElementById("resultModal"));
  let card = document.getElementById("resultCard");
  let title = document.getElementById("resultTitle");

  if (correct) {
    card.classList.remove("incorrect");
    title.innerHTML = "Correct!<br>Good Job!";
  } else {
    card.classList.add("incorrect");
    title.innerHTML = "Try Again!";
  }

  modal.show();
}

function handleResultAction() {
  generateProblem();
  renderProblem();
}

function renderCurrentPage() {
  let page = document.body.dataset.page;

  if (page === "profiles") {
    let list = document.getElementById("profileList");
    if (list) {
      list.innerHTML = "";
      state.profiles.forEach(p => {
        list.innerHTML += `<div><button class="profile-btn" onclick="selectProfile(${p.id})">${p.name}</button></div>`;
      });
    }
  }

  if (page === "problem") {
    generateProblem();
    renderProblem();
  }
}

document.addEventListener("DOMContentLoaded", renderCurrentPage);
