'use strict';

const $ = id => document.getElementById(id);

/* ── DOM ELEMENTS ── */
const problemSelect = $('problem-select');
const vizTitle = $('viz-title');
const termLog = $('terminal-log');
const btnReset = $('btn-reset');

// Views
const views = {
  PC: $('view-PC'),
  RW: $('view-RW'),
  DP: $('view-DP')
};
const controls = {
  PC: $('controls-PC'),
  RW: $('controls-RW'),
  DP: $('controls-DP')
};

// PC Elements
const pcBufCount = $('pc-buf-count');
const pcBufInc = $('pc-buf-inc');
const pcBufDec = $('pc-buf-dec');
const btnProduce = $('btn-produce');
const btnConsume = $('btn-consume');
const pcBufferDisplay = $('pc-buffer');
const valMutex = $('pc-mutex');
const valEmpty = $('pc-empty');
const valFull = $('pc-full');

// RW Elements
const btnReadReq = $('btn-read-req');
const btnReadEnd = $('btn-read-end');
const btnWriteReq = $('btn-write-req');
const btnWriteEnd = $('btn-write-end');
const rwActiveReaders = $('rw-active-readers');
const rwActiveWriter = $('rw-active-writer');
const rwDataVisual = $('rw-data-visual');
const rwDataStatus = $('rw-data-status');
const valRwMutex = $('rw-mutex');
const valRwWrt = $('rw-wrt');
const valRwReadcount = $('rw-readcount');

// DP Elements
const dpSelectId = $('dp-select-id');
const btnHungry = $('btn-hungry');
const btnThink = $('btn-think');
const dpTable = $('dp-table');
const dpChops = [
  $('dp-chop-0'), $('dp-chop-1'), $('dp-chop-2'), $('dp-chop-3'), $('dp-chop-4')
];

/* ── STATE ── */
let activeProblem = 'PC';

// PC State
let pcMax = 5;
let pcBuffer = [];
let pcMutex = 1;
let pcEmpty = 5;
let pcFull = 0;

// RW State
let rwMutex = 1;
let rwWrt = 1;
let readCount = 0;
let isWriting = false;

// DP State
let chops = [1, 1, 1, 1, 1];
let philoStates = ['T', 'T', 'T', 'T', 'T']; // T=Thinking, H=Hungry, E=Eating

/* ── EVENT LISTENERS ── */
problemSelect.addEventListener('change', (e) => {
  activeProblem = e.target.value;
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text;
  
  Object.values(views).forEach(v => v.classList.remove('active'));
  Object.values(controls).forEach(c => c.style.display = 'none');
  
  views[activeProblem].classList.add('active');
  controls[activeProblem].style.display = 'block';
  
  resetState();
});

btnReset.addEventListener('click', resetState);

// PC Listeners
pcBufInc.addEventListener('click', () => { if(pcMax < 10) { pcMax++; resetState(); }});
pcBufDec.addEventListener('click', () => { if(pcMax > 1) { pcMax--; resetState(); }});

btnProduce.addEventListener('click', () => {
  if (pcEmpty === 0) {
    logMsg('Producer blocked. Buffer is full.', 'log-error');
    return;
  }
  if (pcMutex === 0) {
    logMsg('Producer waiting for mutex lock.', 'log-warn');
    return;
  }
  
  // Produce
  pcEmpty--;
  pcMutex = 0; updatePCUI();
  
  setTimeout(() => {
    pcBuffer.push(Math.floor(Math.random() * 99) + 1);
    pcMutex = 1;
    pcFull++;
    logMsg(`Produced item ${pcBuffer[pcBuffer.length-1]}`, 'log-success');
    updatePCUI();
  }, 500);
});

btnConsume.addEventListener('click', () => {
  if (pcFull === 0) {
    logMsg('Consumer blocked. Buffer is empty.', 'log-error');
    return;
  }
  if (pcMutex === 0) {
    logMsg('Consumer waiting for mutex lock.', 'log-warn');
    return;
  }
  
  // Consume
  pcFull--;
  pcMutex = 0; updatePCUI();
  
  setTimeout(() => {
    const item = pcBuffer.shift();
    pcMutex = 1;
    pcEmpty++;
    logMsg(`Consumed item ${item}`, 'log-danger');
    updatePCUI();
  }, 500);
});

// RW Listeners
btnReadReq.addEventListener('click', () => {
  if (isWriting || rwWrt === 0) {
    logMsg('Reader blocked. Writer is active.', 'log-error');
    return;
  }
  
  rwMutex = 0; updateRWUI();
  setTimeout(() => {
    readCount++;
    if (readCount === 1) rwWrt = 0; // First reader locks writer
    rwMutex = 1;
    logMsg(`Reader joined. Total readers: ${readCount}`, 'log-success');
    updateRWUI();
  }, 300);
});

btnReadEnd.addEventListener('click', () => {
  if (readCount === 0) return;
  
  rwMutex = 0; updateRWUI();
  setTimeout(() => {
    readCount--;
    if (readCount === 0) rwWrt = 1; // Last reader unlocks writer
    rwMutex = 1;
    logMsg(`Reader left. Total readers: ${readCount}`, 'log-muted');
    updateRWUI();
  }, 300);
});

btnWriteReq.addEventListener('click', () => {
  if (isWriting || rwWrt === 0) {
    logMsg('Writer blocked. Readers or another writer active.', 'log-error');
    return;
  }
  
  rwWrt = 0;
  isWriting = true;
  logMsg('Writer acquired lock. Writing...', 'log-warn');
  updateRWUI();
});

btnWriteEnd.addEventListener('click', () => {
  if (!isWriting) return;
  
  isWriting = false;
  rwWrt = 1;
  logMsg('Writer finished and released lock.', 'log-muted');
  updateRWUI();
});

// DP Listeners
btnHungry.addEventListener('click', () => {
  const pId = parseInt(dpSelectId.value);
  if (philoStates[pId] === 'E') return;
  
  philoStates[pId] = 'H';
  logMsg(`Philosopher ${pId} is HUNGRY.`, 'log-warn');
  updateDPUI();
  
  // Try to eat
  tryEat(pId);
});

btnThink.addEventListener('click', () => {
  const pId = parseInt(dpSelectId.value);
  if (philoStates[pId] !== 'E') return; // Only eating philo can think and drop forks
  
  const left = pId;
  const right = (pId + 1) % 5;
  
  chops[left] = 1;
  chops[right] = 1;
  philoStates[pId] = 'T';
  logMsg(`Philosopher ${pId} finished eating and is THINKING.`, 'log-muted');
  updateDPUI();
  
  // Notify neighbors if they are hungry
  setTimeout(() => {
    if (philoStates[(pId + 4) % 5] === 'H') tryEat((pId + 4) % 5);
    if (philoStates[(pId + 1) % 5] === 'H') tryEat((pId + 1) % 5);
  }, 400);
});

function tryEat(pId) {
  const left = pId;
  const right = (pId + 1) % 5;
  
  if (chops[left] === 1 && chops[right] === 1) {
    chops[left] = 0;
    chops[right] = 0;
    philoStates[pId] = 'E';
    logMsg(`Philosopher ${pId} acquired chopsticks ${left} and ${right} and is EATING.`, 'log-success');
    updateDPUI();
  } else {
    logMsg(`Philosopher ${pId} cannot eat. Waiting for chopsticks.`, 'log-error');
  }
}

/* ── UI FUNCTIONS ── */
function logMsg(msg, cls = 'log-muted') {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = `> ${msg}`;
  termLog.appendChild(d);
  termLog.scrollTop = termLog.scrollHeight;
}

function clearLog() {
  termLog.innerHTML = '';
}

function resetState() {
  clearLog();
  logMsg(`Initializing ${activeProblem} state...`, 'log-info');
  
  if (activeProblem === 'PC') {
    pcBufCount.textContent = pcMax;
    pcBuffer = [];
    pcMutex = 1;
    pcEmpty = pcMax;
    pcFull = 0;
    updatePCUI();
  } else if (activeProblem === 'RW') {
    rwMutex = 1;
    rwWrt = 1;
    readCount = 0;
    isWriting = false;
    updateRWUI();
  } else if (activeProblem === 'DP') {
    chops = [1, 1, 1, 1, 1];
    philoStates = ['T', 'T', 'T', 'T', 'T'];
    initDPTable();
    updateDPUI();
  }
}

// Update PC
function updatePCUI() {
  valMutex.textContent = pcMutex;
  valEmpty.textContent = pcEmpty;
  valFull.textContent = pcFull;
  
  valMutex.style.color = pcMutex ? 'var(--safe)' : 'var(--danger)';
  
  pcBufferDisplay.innerHTML = '';
  for (let i = 0; i < pcMax; i++) {
    const slot = document.createElement('div');
    if (i < pcBuffer.length) {
      slot.className = 'buffer-slot filled';
      slot.textContent = pcBuffer[i];
    } else {
      slot.className = 'buffer-slot';
    }
    pcBufferDisplay.appendChild(slot);
  }
}

// Update RW
function updateRWUI() {
  valRwMutex.textContent = rwMutex;
  valRwWrt.textContent = rwWrt;
  valRwReadcount.textContent = readCount;
  
  valRwMutex.style.color = rwMutex ? 'var(--safe)' : 'var(--danger)';
  valRwWrt.style.color = rwWrt ? 'var(--safe)' : 'var(--danger)';
  
  rwActiveReaders.textContent = readCount;
  rwActiveWriter.textContent = isWriting ? '1 (Active)' : 'None';
  
  if (isWriting) {
    rwDataVisual.textContent = '📝';
    rwDataStatus.textContent = 'BEING WRITTEN';
    rwDataStatus.style.color = 'var(--warn)';
  } else if (readCount > 0) {
    rwDataVisual.textContent = '👀';
    rwDataStatus.textContent = 'BEING READ';
    rwDataStatus.style.color = 'var(--safe)';
  } else {
    rwDataVisual.textContent = '📄';
    rwDataStatus.textContent = 'IDLE';
    rwDataStatus.style.color = 'var(--muted)';
  }
}

// Update DP
function initDPTable() {
  dpTable.innerHTML = '';
  const r = 70; // radius for philos
  const cr = 40; // radius for chops
  const cx = 100, cy = 100; // center
  
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    
    const p = document.createElement('div');
    p.className = 'philo';
    p.id = `philo-${i}`;
    p.textContent = `P${i}`;
    p.style.left = `${x - 20}px`;
    p.style.top = `${y - 20}px`;
    dpTable.appendChild(p);
    
    const cAngle = (i * 72 - 54) * (Math.PI / 180);
    const cx_c = cx + cr * Math.cos(cAngle);
    const cy_c = cy + cr * Math.sin(cAngle);
    
    const c = document.createElement('div');
    c.className = 'chopstick';
    c.id = `chop-${i}`;
    c.style.left = `${cx_c - 2}px`;
    c.style.top = `${cy_c - 15}px`;
    c.style.transform = `rotate(${i * 72 + 36}deg)`;
    dpTable.appendChild(c);
  }
}

function updateDPUI() {
  for (let i = 0; i < 5; i++) {
    dpChops[i].textContent = chops[i];
    dpChops[i].style.color = chops[i] ? 'var(--safe)' : 'var(--danger)';
    
    const pEl = $(`philo-${i}`);
    const cEl = $(`chop-${i}`);
    
    pEl.className = 'philo';
    if (philoStates[i] === 'E') pEl.classList.add('eating');
    else if (philoStates[i] === 'H') pEl.classList.add('hungry');
    
    cEl.className = 'chopstick';
    if (chops[i] === 0) cEl.classList.add('used');
  }
}

// Init
resetState();
