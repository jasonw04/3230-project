const STORAGE_KEY = 'mathpals_app_state_v1';

// avatars characters for creation
const avatars = [
  '🐻',
  '🐼',
  '🦊',
  '🐸',
  '🐱',
  '🦄',
  '🐵',
  '🐰'
];

// reward characters
const characters = [
  { emoji:'🐻', name:'Bear', starsNeeded:0 },
  { emoji:'🐼', name:'Panda', starsNeeded:5 },
  { emoji:'🦊', name:'Fox', starsNeeded:10 },
  { emoji:'🦄', name:'Unicorn', starsNeeded:20 }
];

let selectedAvatar = avatars[0];
let sessionTimer = null;
let resultMode = 'correct';


// helper to create new profile with default values
function makeProfile(name, avatar) {
  return {
    id: crypto.randomUUID(),
    name,
    avatar,
    createdAt: new Date().toISOString(),
    difficulty:'easy',
    stars:0,
    attempts:[],
    sessionLimit:15,
    timeTodaySec:0,
    timeWeekSec:0,
    muted:false,
    backgroundAvatar:''
  };
}

// default state for the app for no local storage
const defaultState = {
  currentProfileId:null,
  lastDifficulty:'easy',
  currentProblem:null,
  profiles:[
    makeProfile('John', '🐻'),
    makeProfile('Sam', '🐼'),
    makeProfile('Emily', '🦊')
  ]
};

// load from local storage or return default state
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return structuredClone(defaultState);
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed.profiles?.length) {
      return structuredClone(defaultState);
    }

    return parsed;
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

// if no current profile selected select first one
if (!state.currentProfileId && state.profiles.length) {
  state.currentProfileId = state.profiles[0].id;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentProfile() {
  return state.profiles.find(p => p.id === state.currentProfileId) || state.profiles[0] || null;
}

function navigate(page) {
  window.location.href = page;
}


// set current profile and navigate to home
function selectProfile(id) {
  state.currentProfileId = id;
  saveState();
  navigate('home.html');
}

// render profiles to select from
function renderProfiles() {
  const list = document.getElementById('profileList');

  if (!list) {
    return;
  }

  list.innerHTML = '';

  state.profiles.forEach(profile => {
    const row = document.createElement('div');
    row.className = 'profile-row';
    row.innerHTML = `
      <button class="profile-btn" type="button" onclick="selectProfile('${profile.id}')">
        ${profile.name}
      </button>
      <div class="avatar-circle">${profile.avatar}</div>
    `;
    list.appendChild(row);
  });
}

// render welcome page with profile name if selected
function renderHome() {
  const profile = getCurrentProfile();
  const el = document.getElementById('homeWelcome');

  if (el) {
    // show welcome or welconme back with name 
    el.textContent = profile ? `Welcome back: ${profile.name}` : 'Welcome back';
  }
}

// render parent dashboard with child profile
function renderParentDashboard() {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  const childName = document.getElementById('parentChildName');
  const timeToday = document.getElementById('timeToday');
  const timeWeek = document.getElementById('timeWeek');
  const difficultyLabel = document.getElementById('currentDifficultyLabel');
  const barsWrap = document.getElementById('trendBars');
  const manage = document.getElementById('manageChildrenList');

  if (childName) {
    childName.textContent = profile.name;
  }

  if (timeToday) {
    timeToday.textContent = secondsToMinutes(profile.timeTodaySec);
  }

  if (timeWeek) {
    timeWeek.textContent = secondsToMinutes(profile.timeWeekSec);
  }

  if (difficultyLabel) {
    difficultyLabel.textContent = capitalize(profile.difficulty);
  }

  // bar chart for recent attempts
  if (barsWrap) {
    const recent = buildTrendValues(profile);
    barsWrap.innerHTML = recent
      .map(v => `<div class="chart-bar" style="height:${Math.max(v, 8)}%"></div>`)
      .join('');
  }

  // list of child profiles with view and delete buttons
  if (manage) {
    manage.innerHTML = '';

    state.profiles.forEach(child => {
      const item = document.createElement('div');
      item.className = 'manage-row';
      item.innerHTML = `
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div class="d-flex align-items-center gap-3 fs-3">
            <div class="avatar-circle small">${child.avatar}</div>
            <div>
              <div>${child.name}</div>
              <div class="muted-note">
                Difficulty: ${capitalize(child.difficulty)} · Stars: ${child.stars}
              </div>
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="dark-pill" type="button" onclick="viewChildInParentDashboard('${child.id}')">
              View
            </button>
            <button class="dark-pill" type="button" onclick="deleteProfile('${child.id}')">
              Delete
            </button>
          </div>
        </div>
      `;
      manage.appendChild(item);
    });
  }
}

// set current profile and re-render parent dashboard to show selected child details for the view button
function viewChildInParentDashboard(id) {
  state.currentProfileId = id;
  saveState();
  renderParentDashboard();
}

// render account page with profile details
function renderAccount() {
  const profile = getCurrentProfile();


  if (!profile) {
    return;
  }

  const total = profile.attempts.length;
  const correct = profile.attempts.filter(a => a.correct).length;

  setText('accountName', profile.name);
  setText('accountDate', new Date(profile.createdAt).toLocaleDateString());
  setText('accountAge', daysOld(profile.createdAt));
  setText('statTotal', total);
  setText('statCorrect', correct);
  setText('statAccuracy', total ? `${Math.round((correct / total) * 100)}%` : '0%');
  setText('statStars', profile.stars);

  const muteSwitch = document.getElementById('muteSwitch');

  if (muteSwitch) {
    muteSwitch.checked = !!profile.muted;
  }
}

// render game page with current problem and answer choices
function renderGame() {
  const profile = getCurrentProfile();
  const problem = state.currentProblem;

  if (!profile || !problem) {
    return;
  }

  // set problem text and star level
  setText('gameDifficultyTitle', `${problem.starLevel} Star Difficulty`);
  setText('gameStars', Array.from({ length: problem.starLevel }, () => '★').join(' '));
  setText('problemText', problem.prompt);

  const apples = document.getElementById('appleWrap');
  const answers = document.getElementById('answerButtons');

  if (!apples || !answers) {
    return;
  }

  apples.innerHTML = '';

  const allApples = [];

  // create apple objects for visualization based on problem type and numbers
  if (problem.operation === '+') {
    for (let i = 0; i < problem.first; i++) {
      allApples.push({ kind:'normal' });
    }

    for (let i = 0; i < problem.second; i++) {
      allApples.push({ kind:'add' });
    }
  } else {
    for (let i = 0; i < problem.first - problem.second; i++) {
      allApples.push({ kind:'normal' });
    }

    for (let i = 0; i < problem.second; i++) {
      allApples.push({ kind:'eaten' });
    }
  }

  // render apple visualization for different types of apples based on the operation and numbers in the problem
  allApples.forEach(item => {
    const apple = document.createElement('div');
    apple.className = `apple ${item.kind}`;
    apple.textContent = item.kind === 'eaten' ? '🍏' : '🍎';
    apples.appendChild(apple);
  });

  answers.innerHTML = '';

  // render answer choice buttons
  problem.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.type = 'button';
    btn.textContent = `${choice} ${choice === 1 ? 'Apple' : 'Apples'}`;
    btn.onclick = () => answerProblem(choice);
    answers.appendChild(btn);
  });
}

// render history page with past attempts and summary
function renderHistory() {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  const total = profile.attempts.length;
  const correct = profile.attempts.filter(a => a.correct).length;
  const summary = document.getElementById('historySummary');
  const list = document.getElementById('historyList');

  // render summary of total attempts correct answers and accuracy
  if (summary) {
    summary.innerHTML = `
      <div class="session-chip">Child: ${profile.name}</div>
      <div class="session-chip">Attempts: ${total}</div>
      <div class="session-chip">Accuracy: ${total ? Math.round((correct / total) * 100) : 0}%</div>
    `;
  }

  // check for attempts and render no attempts if there are none
  // if there are attempts render all past attempts with chosen answer correct or incorrect and time of attempt with most recent attempts first and limit to 20 attempts
  if (list) {
    list.innerHTML = profile.attempts.length
      ? ''
      : '<div class="list-card">No answers yet. Start a problem set first.</div>';

    [...profile.attempts].reverse().slice(0, 20).forEach(item => {
      const card = document.createElement('div');
      card.className = 'list-card';
      card.innerHTML = `
      // render past attempt with prompt chosen answer correct or incorrect and time of attempt
        <div class="d-flex justify-content-between flex-wrap gap-2">
          <strong>${item.prompt}</strong>
          <span class="${item.correct ? 'text-success' : 'text-warning'} fw-bold">
            ${item.correct ? 'Correct' : 'Incorrect'}
          </span>
        </div>
        <div class="mt-2 text-secondary">
          Chosen answer: ${item.answer} · ${new Date(item.time).toLocaleString()}
        </div>
      `;
      list.appendChild(card);
    });
  }
}

// render rewards page with characters to ublock
function renderRewards() {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  // show current star count
  setText('rewardStarCount', profile.stars);

  const grid = document.getElementById('rewardsGrid');

  if (!grid) {
    return;
  }

  // clear grid and add remove background option
  grid.innerHTML = `
    <div class="col-12 d-flex justify-content-center mb-3">
      <button class="dark-pill" type="button" onclick="clearBackgroundAvatar()">
        Remove Background
      </button>
    </div>
  `;

  // render characters with unlock status based on star count 
  // show select button for unlocked characters to set as background avatar with indication of currently selected background avatar
  characters.forEach(c => {
    const unlocked = profile.stars >= c.starsNeeded;
    const isSelected = profile.backgroundAvatar === c.emoji;

    const col = document.createElement('div');
    col.className = 'col-md-3 col-sm-6';

    // render character card with unlock status and select button for unlocked characters to set as background 
    col.innerHTML = `
      <div class="character-card ${unlocked ? '' : 'locked'}">
        <div class="character-emoji">${c.emoji}</div>
        <h4 class="mt-3">${c.name}</h4>
        <p class="mb-1">${unlocked ? 'Unlocked' : 'Locked'}</p>
        <p class="muted-note mb-3">Need ${c.starsNeeded} stars</p>
        ${
          unlocked
          // show select button for unlocked characters to set as background
            ? `<button class="dark-pill" type="button" onclick="setBackgroundAvatar('${c.emoji}')">
                 ${isSelected ? 'Selected' : 'Select'}
               </button>`
            : ''
        }
      </div>
    `;

    grid.appendChild(col);
  });
}

// render avatar choices
function renderAvatarChoices() {
  const wrap = document.getElementById('avatarChoices');

  if (!wrap) {
    return;
  }

  wrap.innerHTML = '';

  avatars.forEach(avatar => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-light border rounded-circle d-flex align-items-center justify-content-center';
    btn.style.width = '58px';
    btn.style.height = '58px';
    btn.style.fontSize = '1.7rem';
    btn.textContent = avatar;

    btn.onclick = () => {
      selectedAvatar = avatar;
      renderAvatarChoices();
    };

    if (selectedAvatar === avatar) {
      btn.style.outline = '3px solid #57b1aa';
    }

    wrap.appendChild(btn);
  });
}

// create new profile with selected avatar and name and session limit 
function createProfile() {
  const nameInput = document.getElementById('newChildName');
  const limitInput = document.getElementById('newChildLimit');
  const name = nameInput?.value.trim();
  const limit = Number(limitInput?.value) || 15;

  if (!name) {
    alert('Enter a child name first.');
    return;
  }

  const profile = makeProfile(name, selectedAvatar);
  profile.sessionLimit = Math.min(Math.max(limit, 5), 60);

  state.profiles.push(profile);
  state.currentProfileId = profile.id;
  saveState();

  const modalEl = document.getElementById('createProfileModal');
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;

  if (modal) {
    modal.hide();
  }

  if (nameInput) {
    nameInput.value = '';
  }

  if (limitInput) {
    limitInput.value = 15;
  }

  selectedAvatar = avatars[0];
  navigate('home.html');
}

// delete profile with confirmation and ensure at least one profile remains and if deleted profile is current profile switch to another profile
function deleteProfile(id) {
  // check for at least 1 profile
  if (state.profiles.length === 1) {
    alert('Keep at least one child profile in the app.');
    return;
  }

  const profile = state.profiles.find(p => p.id === id);

  if (!profile) {
    return;
  }

  if (!confirm(`Delete ${profile.name}?`)) {
    return;
  }

  state.profiles = state.profiles.filter(p => p.id !== id);

  if (state.currentProfileId === id) {
    state.currentProfileId = state.profiles[0]?.id || null;
  }

  saveState();
  renderCurrentPage();
}

// set profile difficulty and save state and re-render parent dashboard to show updated difficulty
function setProfileDifficulty(diff) {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  profile.difficulty = diff;
  saveState();
  renderParentDashboard();
}

// start game with selected difficulty and generate first problem and start session timer
function startGame(diff) {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  profile.difficulty = diff;
  state.lastDifficulty = diff;

  nextProblem(false);
  startSessionTimer();
  saveState();
  navigate('problem.html');
}

// generate next problem based on profile difficulty or last difficulty
function nextProblem(navigateAfter = true) {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  // use profile difficulty or last difficulty or default 
  const diff = profile.difficulty || state.lastDifficulty || 'easy';
  state.currentProblem = generateProblem(diff);
  saveState();

  if (navigateAfter) {
    navigate('problem.html');
  } else {
    renderGame();
  }
}

// generate problem based on difficulty with random numbers and operation and create prompt text based on operation and numbers
function generateProblem(diff) {

  // different ranges for different diifficulties
  const ranges = {
    easy:{ min:1, max:5, starLevel:1 },
    medium:{ min:1, max:10, starLevel:2 },
    hard:{ min:4, max:10, starLevel:3 }
  };

  const cfg = ranges[diff] || ranges.easy;
  const operation = Math.random() > 0.5 ? '+' : '-';

  // generate random numbers for first and second operand based on difficulty
  let first = rand(cfg.min, cfg.max);
  let second = rand(cfg.min, cfg.max);

  // make sure they do not become negative for subtraction problems
  if (operation === '-' && second > first) {
    [first, second] = [second, first];
  }

  // calculate answer based on operation and create prompt text using profile name or default name
  const answer = operation === '+' ? first + second : first - second;
  // default name if no profile or name is available for prompt text
  const usedName = getCurrentProfile()?.name || 'John';

  // create prompt text based on operation and numbers in the problem for subtraction or addition problems using profile
  const prompt = operation === '+'
    ? `If ${usedName} has ${first} apples and gets ${second} more apples, how many apples are there now?`
    : `If ${usedName} has ${first} apples and eats ${second} apples, how many are left over?`;

  return {
    first,
    second,
    answer,
    choices: makeChoices(answer),
    operation,
    prompt,
    starLevel: cfg.starLevel
  };
}

// create answer choices with correct answer and random offsets and shuffle them
function makeChoices(answer) {
  const set = new Set([answer]);

  // add random offsets to answer to create 3 unique choices for the answer buttons
  while (set.size < 3) {
    const offset = rand(-3, 3) || 1;
    set.add(Math.max(0, answer + offset));
  }

  // shuffle choices
  return [...set].sort(() => Math.random() - 0.5);
}

// handle answer choice selection and update profile attempts and stars and show result modal with feedback and play sound based on correct or incorrect answer
function answerProblem(choice) {
  const profile = getCurrentProfile();
  const problem = state.currentProblem;

  if (!profile || !problem) {
    return;
  }

  // check if answer is correct
  const correct = choice === problem.answer;

  // update profile attempts with correct or incorrect answer and time of attempt and difficulty of problem 
  profile.attempts.push({
    prompt: problem.prompt,
    answer: choice,
    correct,
    time: new Date().toISOString(),
    difficulty: profile.difficulty
  });

  // if correct add star to profile and play correct sound and show correct result modal with feedback 
  // if incorrect play incorrect sound and show incorrect result modal with feedback
  if (correct) {
    profile.stars += 1;
    playSound(true);
    saveState();
    showResultModal(true);
  } else {
    playSound(false);
    saveState();
    showResultModal(false);
  }
}

// show results with incorrect or correct
function showResultModal(correct) {
  resultMode = correct ? 'correct' : 'incorrect';

  const card = document.getElementById('resultCard');
  const title = document.getElementById('resultTitle');
  const starsWrap = document.getElementById('resultStarsWrap');
  const actionBtn = document.getElementById('resultActionBtn');

  if (!card || !title || !starsWrap || !actionBtn) {
    return;
  }

  // update result based on answer
  if (correct) {
    card.classList.remove('incorrect');
    title.innerHTML = 'Correct!<br>Good Job!';
    starsWrap.style.display = 'inline-block';
    starsWrap.textContent = Array.from(
      // create star visualization for the result modal based on the star level of the problem with max 3 stars
      { length: state.currentProblem?.starLevel || 1 },
      () => '★'
    ).join(' ');
    actionBtn.textContent = 'Next';
    actionBtn.className = 'result-btn result-next';
  
  } else {
    card.classList.add('incorrect');
    title.innerHTML = 'Incorrect<br>Not there yet!';
    starsWrap.style.display = 'none';
    actionBtn.textContent = 'Retry';
    actionBtn.className = 'result-btn result-retry';
  }

  const modalEl = document.getElementById('resultModal');

  if (!modalEl) {
    return;
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// handle result modal action button click 
function handleResultAction() {
  const modalEl = document.getElementById('resultModal');
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;

  if (modal) {
    modal.hide();
  }

  if (resultMode === 'correct') {
    nextProblem(false);
  }
}

// close result modal and navigate to home 
function closeResultModalToHome() {
  const modalEl = document.getElementById('resultModal');
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;

  if (modal) {
    modal.hide();
  }

  // stop timer
  stopSessionTimer();
  navigate('home.html');
}

// play sound based on correct or incorrect answer with different tones and skip if profile is muted
function playSound(success) {
  const profile = getCurrentProfile();

  // mute sound if profile is muted
  if (profile?.muted) {
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = success ? 'triangle' : 'sine';
    osc.frequency.value = success ? 660 : 260;
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    osc.frequency.exponentialRampToValueAtTime(
      success ? 880 : 220,
      ctx.currentTime + 0.18
    );

    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.stop(ctx.currentTime + 0.22);
  } catch {}
}

// speak problem button
function speakProblem() {
  const problem = state.currentProblem;
  const profile = getCurrentProfile();

  if (!problem || profile?.muted) {
    return;
  }

  // use speech synthesis to speak the problem prompt if available in the browser and profile is not muted
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(problem.prompt);
    utter.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }
}

// start session timer to track time spent on problem sets
function startSessionTimer() {
  stopSessionTimer(false);

  sessionTimer = setInterval(() => {
    const profile = getCurrentProfile();

    if (!profile) {
      return;
    }

    // increment time spent today and this week for the profile every second
    profile.timeTodaySec += 1;
    profile.timeWeekSec += 1;
    saveState();
  }, 1000);
}

// stop session timer
function stopSessionTimer(save = true) {
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }

  sessionTimer = null;

  if (save) {
    saveState();
  }
}

// build trend values for the bar chart
function buildTrendValues(profile) {
  const recent = profile.attempts.slice(-6);

  if (!recent.length) {
    return [20, 30, 25, 40, 35, 50];
  }

  const vals = [];

  // calculate accuracy rate for each attempt and build an array of accuracy rates
  for (let i = 0; i < recent.length; i++) {
    const slice = recent.slice(0, i + 1);
    const rate = Math.round(
      (slice.filter(x => x.correct).length / slice.length) * 100
    );
    vals.push(rate);
  }

  while (vals.length < 6) {
    vals.unshift(Math.max(10, vals[0] || 20));
  }

  return vals;
}

// helper to calculate how many days old a profile is
function daysOld(dateString) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000)
  );

  return days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`;
}


function secondsToMinutes(seconds) {
  return `${Math.floor(seconds / 60)} min`;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function setText(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = value;
  }
}

// handle mute switch change to update profile muted status 
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'muteSwitch') {
    const profile = getCurrentProfile();

    if (!profile) {
      return;
    }

    profile.muted = e.target.checked;
    saveState();
  }
});

// render current page 
function renderCurrentPage() {
  applyAvatarBackground();

  const page = document.body.dataset.page;

  // 
  if (page === 'profiles') {
    renderProfiles();
    renderAvatarChoices();
  } else if (page === 'home') {
    renderHome();
  } else if (page === 'parent') {
    renderParentDashboard();
    renderAvatarChoices();
  } else if (page === 'account') {
    renderAccount();
  } else if (page === 'problem') {
    if (!state.currentProblem) {
      state.currentProblem = generateProblem(getCurrentProfile()?.difficulty || 'easy');
    }
    renderGame();
  } else if (page === 'history') {
    renderHistory();
  } else if (page === 'rewards') {
    renderRewards();
  }
}

// avatar background
function applyAvatarBackground() {
  const bg = document.getElementById('avatarBackground');
  const profile = getCurrentProfile();

  // if no background selected do not render
  if (!bg || !profile) {
    return;
  }

  bg.innerHTML = '';

  if (!profile.backgroundAvatar) {
    return;
  }

  // calculate number of rows and columns needed to fill the screen with the avatar
  const approxCellSize = 176; // icon space + gap
  const cols = Math.max(1, Math.floor(window.innerWidth / approxCellSize));
  const rows = Math.max(1, Math.floor(window.innerHeight / approxCellSize));


  // create grid and make diagonal pattern with avatar
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'avatar-bg-cell';

      // create diagonal pattern with avatar by only rendering avatar in cells where row and column index add up to an even number
      if ((row + col) % 2 === 0) {
        cell.textContent = profile.backgroundAvatar;
      }

      bg.appendChild(cell);
    }
  }
}
// re-apply avatar background on window resize to adjust grid
window.addEventListener('resize', applyAvatarBackground);

// set background avatar for rewards page
function setBackgroundAvatar(avatar) {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  profile.backgroundAvatar = avatar;
  saveState();
  applyAvatarBackground();
  renderRewards();
}

// clear background avatar selection and update rewards page
function clearBackgroundAvatar() {
  const profile = getCurrentProfile();

  if (!profile) {
    return;
  }

  profile.backgroundAvatar = '';
  saveState();
  applyAvatarBackground();
  renderRewards();
}


document.addEventListener('DOMContentLoaded', renderCurrentPage);