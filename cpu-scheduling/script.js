'use strict';

const $ = id => document.getElementById(id);

let processes = [];
let processCount = 0;

/* ── DOM ELEMENTS ── */
const processInputsContainer = $('process-inputs');
const addProcessBtn = $('add-process-btn');
const clearProcessBtn = $('clear-processes-btn');
const runBtn = $('run-btn');
const algoSelect = $('algo-select');
const tqContainer = $('tq-container');
const timeQuantumInput = $('time-quantum');

const ganttChart = $('gantt-chart');
const resultsBody = $('results-body');
const avgWtEl = $('avg-wt');
const avgTatEl = $('avg-tat');
const cpuUtilEl = $('cpu-util');
const vizTitle = $('viz-title');
const simStatus = $('sim-status');

/* ── EVENT LISTENERS ── */
algoSelect.addEventListener('change', (e) => {
  tqContainer.style.display = e.target.value === 'RR' ? 'block' : 'none';
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text;
});

addProcessBtn.addEventListener('click', () => addProcessRow());
clearProcessBtn.addEventListener('click', () => {
  processInputsContainer.innerHTML = '';
  processCount = 0;
});

$('preset-1').addEventListener('click', () => loadPreset(1));
$('preset-2').addEventListener('click', () => loadPreset(2));

runBtn.addEventListener('click', runSimulation);

/* ── UI FUNCTIONS ── */
function addProcessRow(at = 0, bt = 5, prio = 1) {
  processCount++;
  const pid = `P${processCount}`;
  
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '6px';
  row.style.alignItems = 'center';
  row.innerHTML = `
    <span class="edge-prefix" style="width:25px;">${pid}</span>
    <input type="number" class="edge-input at-input" value="${at}" min="0" placeholder="AT" title="Arrival Time" style="flex:1;">
    <input type="number" class="edge-input bt-input" value="${bt}" min="1" placeholder="BT" title="Burst Time" style="flex:1;">
    <input type="number" class="edge-input prio-input" value="${prio}" min="1" placeholder="Prio" title="Priority" style="flex:1;">
    <span class="rm" onclick="this.parentElement.remove()" style="font-size:1rem; cursor:pointer;">×</span>
  `;
  row.dataset.pid = pid;
  processInputsContainer.appendChild(row);
}

function loadPreset(num) {
  processInputsContainer.innerHTML = '';
  processCount = 0;
  if (num === 1) {
    addProcessRow(0, 5, 2);
    addProcessRow(1, 3, 1);
    addProcessRow(2, 8, 4);
    addProcessRow(3, 6, 3);
  } else {
    addProcessRow(0, 8, 3);
    addProcessRow(1, 4, 1);
    addProcessRow(2, 9, 4);
    addProcessRow(3, 5, 2);
    addProcessRow(4, 2, 5);
  }
}

// Init with one process
addProcessRow(0, 5, 1);
addProcessRow(1, 3, 2);
addProcessRow(2, 1, 3);

/* ── SIMULATION LOGIC ── */

function getProcessesFromUI() {
  const rows = processInputsContainer.children;
  const procs = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pid = row.dataset.pid;
    const at = parseInt(row.querySelector('.at-input').value) || 0;
    const bt = parseInt(row.querySelector('.bt-input').value) || 1;
    const prio = parseInt(row.querySelector('.prio-input').value) || 1;
    procs.push({ id: pid, at, bt, prio, remainingBt: bt, ct: 0, tat: 0, wt: 0 });
  }
  return procs;
}

function runSimulation() {
  const procs = getProcessesFromUI();
  if (procs.length === 0) return alert("Please add at least one process.");
  
  const algo = algoSelect.value;
  let gantt = [];
  
  simStatus.textContent = 'RUNNING';
  simStatus.style.color = 'var(--warn)';
  
  // Clone array to avoid mutating original objects until needed
  const pList = JSON.parse(JSON.stringify(procs));
  
  if (algo === 'FCFS') gantt = runFCFS(pList);
  else if (algo === 'SJF') gantt = runSJF(pList);
  else if (algo === 'SRTF') gantt = runSRTF(pList);
  else if (algo === 'PRIORITY') gantt = runPriority(pList);
  else if (algo === 'RR') gantt = runRR(pList, parseInt(timeQuantumInput.value) || 2);

  // Calculate TAT and WT
  let totalWT = 0, totalTAT = 0, totalBT = 0;
  
  pList.forEach(p => {
    p.tat = p.ct - p.at;
    p.wt = p.tat - p.bt;
    totalWT += p.wt;
    totalTAT += p.tat;
    totalBT += p.bt;
  });
  
  const makeTime = gantt.length > 0 ? gantt[gantt.length-1].end : 0;
  const util = makeTime > 0 ? ((totalBT / makeTime) * 100).toFixed(1) : 0;

  avgWtEl.textContent = (totalWT / pList.length).toFixed(2);
  avgTatEl.textContent = (totalTAT / pList.length).toFixed(2);
  cpuUtilEl.textContent = util + '%';

  renderGantt(gantt, makeTime);
  renderTable(pList);
  
  simStatus.textContent = 'DONE';
  simStatus.style.color = 'var(--safe)';
}

/* ── ALGORITHMS ── */

function runFCFS(procs) {
  procs.sort((a, b) => a.at - b.at);
  let time = 0;
  const gantt = [];
  
  for (let p of procs) {
    if (time < p.at) {
      gantt.push({ id: 'IDLE', start: time, end: p.at });
      time = p.at;
    }
    gantt.push({ id: p.id, start: time, end: time + p.bt });
    time += p.bt;
    p.ct = time;
  }
  return gantt;
}

function runSJF(procs) {
  let time = 0;
  let completed = 0;
  const gantt = [];
  const n = procs.length;
  const isCompleted = Array(n).fill(false);
  
  while (completed !== n) {
    let idx = -1;
    let minBt = Infinity;
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && !isCompleted[i]) {
        if (procs[i].bt < minBt) {
          minBt = procs[i].bt;
          idx = i;
        } else if (procs[i].bt === minBt && procs[i].at < procs[idx].at) {
           idx = i;
        }
      }
    }
    
    if (idx !== -1) {
      gantt.push({ id: procs[idx].id, start: time, end: time + procs[idx].bt });
      time += procs[idx].bt;
      procs[idx].ct = time;
      isCompleted[idx] = true;
      completed++;
    } else {
      let nextArrival = Math.min(...procs.filter((p, i) => !isCompleted[i]).map(p => p.at));
      gantt.push({ id: 'IDLE', start: time, end: nextArrival });
      time = nextArrival;
    }
  }
  return gantt;
}

function runPriority(procs) {
  let time = 0;
  let completed = 0;
  const gantt = [];
  const n = procs.length;
  const isCompleted = Array(n).fill(false);
  
  while (completed !== n) {
    let idx = -1;
    let minPrio = Infinity; // Lower number = higher priority
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && !isCompleted[i]) {
        if (procs[i].prio < minPrio) {
          minPrio = procs[i].prio;
          idx = i;
        } else if (procs[i].prio === minPrio && procs[i].at < procs[idx].at) {
          idx = i;
        }
      }
    }
    
    if (idx !== -1) {
      gantt.push({ id: procs[idx].id, start: time, end: time + procs[idx].bt });
      time += procs[idx].bt;
      procs[idx].ct = time;
      isCompleted[idx] = true;
      completed++;
    } else {
      let nextArrival = Math.min(...procs.filter((p, i) => !isCompleted[i]).map(p => p.at));
      gantt.push({ id: 'IDLE', start: time, end: nextArrival });
      time = nextArrival;
    }
  }
  return gantt;
}

function runSRTF(procs) {
  let time = 0;
  let completed = 0;
  const gantt = [];
  const n = procs.length;
  let lastPid = null;
  let blockStart = 0;
  
  while (completed !== n) {
    let idx = -1;
    let minBt = Infinity;
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && procs[i].remainingBt > 0) {
        if (procs[i].remainingBt < minBt) {
          minBt = procs[i].remainingBt;
          idx = i;
        } else if (procs[i].remainingBt === minBt && procs[i].at < procs[idx].at) {
          idx = i;
        }
      }
    }
    
    if (idx !== -1) {
      if (lastPid !== procs[idx].id) {
        if (lastPid !== null) gantt.push({ id: lastPid, start: blockStart, end: time });
        lastPid = procs[idx].id;
        blockStart = time;
      }
      
      procs[idx].remainingBt--;
      time++;
      
      if (procs[idx].remainingBt === 0) {
        procs[idx].ct = time;
        completed++;
        gantt.push({ id: lastPid, start: blockStart, end: time });
        lastPid = null;
        blockStart = time;
      }
    } else {
      if (lastPid !== 'IDLE') {
        if (lastPid !== null) gantt.push({ id: lastPid, start: blockStart, end: time });
        lastPid = 'IDLE';
        blockStart = time;
      }
      time++;
    }
  }
  return mergeGantt(gantt);
}

function runRR(procs, tq) {
  // Setup arrival sorted array
  let pCopy = [...procs].sort((a, b) => a.at - b.at);
  let time = 0;
  const gantt = [];
  let queue = [];
  let completed = 0;
  const n = procs.length;
  
  let i = 0;
  while (i < n && pCopy[i].at <= time) {
    queue.push(pCopy[i]);
    i++;
  }
  
  if (queue.length === 0) {
    if (i < n) {
      gantt.push({ id: 'IDLE', start: time, end: pCopy[i].at });
      time = pCopy[i].at;
      queue.push(pCopy[i]);
      i++;
    }
  }
  
  while (completed !== n) {
    if (queue.length === 0) {
      if (i < n) {
        gantt.push({ id: 'IDLE', start: time, end: pCopy[i].at });
        time = pCopy[i].at;
        queue.push(pCopy[i]);
        i++;
      }
      continue;
    }
    
    let p = queue.shift();
    let runTime = Math.min(p.remainingBt, tq);
    
    gantt.push({ id: p.id, start: time, end: time + runTime });
    time += runTime;
    p.remainingBt -= runTime;
    
    // Check arrivals during this run
    while (i < n && pCopy[i].at <= time) {
      queue.push(pCopy[i]);
      i++;
    }
    
    if (p.remainingBt > 0) {
      queue.push(p);
    } else {
      // Find original reference
      let orig = procs.find(op => op.id === p.id);
      orig.ct = time;
      completed++;
    }
  }
  return mergeGantt(gantt);
}

function mergeGantt(gantt) {
  if (gantt.length === 0) return gantt;
  const res = [gantt[0]];
  for (let i = 1; i < gantt.length; i++) {
    const last = res[res.length - 1];
    if (last.id === gantt[i].id && last.end === gantt[i].start) {
      last.end = gantt[i].end;
    } else {
      res.push(gantt[i]);
    }
  }
  return res;
}

/* ── RENDERING ── */

const colors = [
  'rgba(99,102,241,0.15)', // indigo
  'rgba(22,163,74,0.15)',  // green
  'rgba(217,119,6,0.15)',  // amber
  'rgba(220,38,38,0.15)',  // red
  'rgba(168,85,247,0.15)', // purple
  'rgba(14,165,233,0.15)', // sky
  'rgba(236,72,153,0.15)', // pink
  'rgba(20,184,166,0.15)'  // teal
];
const borderColors = [
  '#6366f1', '#16a34a', '#d97706', '#dc2626',
  '#a855f7', '#0ea5e9', '#ec4899', '#14b8a6'
];

function renderGantt(gantt, totalTime) {
  ganttChart.innerHTML = '';
  if (gantt.length === 0) return;
  
  gantt.forEach((block, idx) => {
    const widthPct = ((block.end - block.start) / totalTime) * 100;
    const div = document.createElement('div');
    div.className = 'gantt-block' + (block.id === 'IDLE' ? ' idle-block' : '');
    div.style.width = widthPct + '%';
    
    if (block.id !== 'IDLE') {
      const pIdx = parseInt(block.id.replace('P','')) % colors.length;
      div.style.backgroundColor = colors[pIdx];
      div.style.color = borderColors[pIdx];
      // div.style.borderBottom = `3px solid ${borderColors[pIdx]}`;
    }
    
    div.textContent = block.id;
    
    // Start time label (only for first block)
    if (idx === 0) {
      const startLbl = document.createElement('span');
      startLbl.className = 'gantt-time start';
      startLbl.textContent = block.start;
      div.appendChild(startLbl);
    }
    
    // End time label
    const endLbl = document.createElement('span');
    endLbl.className = 'gantt-time';
    endLbl.textContent = block.end;
    div.appendChild(endLbl);
    
    ganttChart.appendChild(div);
  });
}

function renderTable(procs) {
  resultsBody.innerHTML = '';
  procs.sort((a, b) => {
    const numA = parseInt(a.id.replace('P',''));
    const numB = parseInt(b.id.replace('P',''));
    return numA - numB;
  });
  
  procs.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--accent); font-weight:800;">${p.id}</td>
      <td>${p.at}</td>
      <td>${p.bt}</td>
      <td>${p.prio}</td>
      <td style="color:var(--safe);">${p.ct}</td>
      <td style="color:var(--warn);">${p.tat}</td>
      <td style="color:var(--danger);">${p.wt}</td>
    `;
    resultsBody.appendChild(tr);
  });
}
