'use strict';

const $ = id => document.getElementById(id);

let numFrames = 3;

/* ── DOM ELEMENTS ── */
const frameCountEl = $('frame-count');
const frameIncBtn = $('frame-inc');
const frameDecBtn = $('frame-dec');

const refStringInput = $('ref-string');
const randomBtn = $('random-btn');
const algoSelect = $('algo-select');
const runBtn = $('run-btn');

const vizTitle = $('viz-title');
const simStatus = $('sim-status');
const tableContainer = $('table-container');
const termLog = $('terminal-log');

const statFaults = $('stat-faults');
const statHits = $('stat-hits');
const statRatio = $('stat-ratio');

/* ── EVENT LISTENERS ── */
algoSelect.addEventListener('change', (e) => {
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text;
});

frameIncBtn.addEventListener('click', () => {
  if (numFrames < 8) {
    numFrames++;
    frameCountEl.textContent = numFrames;
  }
});

frameDecBtn.addEventListener('click', () => {
  if (numFrames > 1) {
    numFrames--;
    frameCountEl.textContent = numFrames;
  }
});

randomBtn.addEventListener('click', () => {
  const len = Math.floor(Math.random() * 10) + 10; // 10-20
  const maxPage = 9;
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(Math.floor(Math.random() * (maxPage + 1)));
  }
  refStringInput.value = arr.join(', ');
});

runBtn.addEventListener('click', runSimulation);

/* ── UTILS ── */
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

/* ── ALGORITHMS ── */

function runSimulation() {
  const refStr = refStringInput.value;
  if (!refStr) return alert("Please enter a reference string.");
  
  const pages = refStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  if (pages.length === 0) return alert("Invalid reference string.");
  
  const algo = algoSelect.value;
  clearLog();
  logMsg(`Running ${algoSelect.options[algoSelect.selectedIndex].text}...`, 'log-info');
  
  simStatus.textContent = 'RUNNING';
  simStatus.style.color = 'var(--warn)';
  
  let result;
  if (algo === 'FIFO') result = runFIFO(pages, numFrames);
  else if (algo === 'LRU') result = runLRU(pages, numFrames);
  else if (algo === 'LFU') result = runLFU(pages, numFrames);
  else if (algo === 'SECOND_CHANCE') result = runSecondChance(pages, numFrames);
  else if (algo === 'OPTIMAL') result = runOptimal(pages, numFrames);
  
  renderTable(pages, result.history, result.status);
  
  statFaults.textContent = result.faults;
  statHits.textContent = result.hits;
  statRatio.textContent = ((result.hits / pages.length) * 100).toFixed(1) + '%';
  
  simStatus.textContent = 'DONE';
  simStatus.style.color = 'var(--safe)';
  logMsg(`Completed with ${result.faults} faults and ${result.hits} hits.`, 'log-success');
}

function runFIFO(pages, framesCount) {
  let frames = [];
  let faults = 0;
  let hits = 0;
  let history = [];
  let status = []; // 'hit' or 'fault'
  
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (frames.includes(p)) {
      hits++;
      status.push('hit');
      logMsg(`Page ${p} already in memory. (Hit)`, 'log-success');
    } else {
      faults++;
      status.push('fault');
      if (frames.length < framesCount) {
        frames.push(p);
        logMsg(`Page ${p} loaded into empty frame. (Fault)`, 'log-warn');
      } else {
        const removed = frames.shift();
        frames.push(p);
        logMsg(`Page ${p} replaced Page ${removed}. (Fault)`, 'log-danger');
      }
    }
    history.push([...frames]);
  }
  return { faults, hits, history, status };
}

function runLRU(pages, framesCount) {
  let frames = [];
  let faults = 0;
  let hits = 0;
  let history = [];
  let status = [];
  
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const idx = frames.indexOf(p);
    
    if (idx !== -1) {
      hits++;
      status.push('hit');
      // Move to back (most recently used)
      frames.splice(idx, 1);
      frames.push(p);
      logMsg(`Page ${p} already in memory. (Hit)`, 'log-success');
    } else {
      faults++;
      status.push('fault');
      if (frames.length < framesCount) {
        frames.push(p);
        logMsg(`Page ${p} loaded into empty frame. (Fault)`, 'log-warn');
      } else {
        const removed = frames.shift(); // LRU is at the front
        frames.push(p);
        logMsg(`Page ${p} replaced Page ${removed}. (Fault)`, 'log-danger');
      }
    }
    history.push([...frames]);
  }
  return { faults, hits, history, status };
}

function runLFU(pages, framesCount) {
  let frames = [];
  let freq = {};
  let arrival = {};
  let faults = 0;
  let hits = 0;
  let history = [];
  let status = [];
  
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    
    if (frames.includes(p)) {
      hits++;
      status.push('hit');
      freq[p]++;
      logMsg(`Page ${p} already in memory. (Hit)`, 'log-success');
    } else {
      faults++;
      status.push('fault');
      if (frames.length < framesCount) {
        frames.push(p);
        freq[p] = 1;
        arrival[p] = i;
        logMsg(`Page ${p} loaded into empty frame. (Fault)`, 'log-warn');
      } else {
        let minFreq = Infinity;
        let oldest = Infinity;
        let replaceIdx = -1;
        
        for (let j = 0; j < frames.length; j++) {
          let fp = frames[j];
          if (freq[fp] < minFreq) {
            minFreq = freq[fp];
            oldest = arrival[fp];
            replaceIdx = j;
          } else if (freq[fp] === minFreq) {
            if (arrival[fp] < oldest) {
              oldest = arrival[fp];
              replaceIdx = j;
            }
          }
        }
        
        const removed = frames[replaceIdx];
        delete freq[removed];
        delete arrival[removed];
        
        frames[replaceIdx] = p;
        freq[p] = 1;
        arrival[p] = i;
        logMsg(`Page ${p} replaced Page ${removed}. (Fault)`, 'log-danger');
      }
    }
    history.push([...frames]);
  }
  return { faults, hits, history, status };
}

function runSecondChance(pages, framesCount) {
  let frames = [];
  let refBits = [];
  let pointer = 0;
  let faults = 0;
  let hits = 0;
  let history = [];
  let status = [];
  
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const idx = frames.indexOf(p);
    
    if (idx !== -1) {
      hits++;
      status.push('hit');
      refBits[idx] = 1;
      logMsg(`Page ${p} already in memory. (Hit, Ref=1)`, 'log-success');
    } else {
      faults++;
      status.push('fault');
      if (frames.length < framesCount) {
        frames.push(p);
        refBits.push(0);
        logMsg(`Page ${p} loaded into empty frame. (Fault)`, 'log-warn');
      } else {
        while (refBits[pointer] === 1) {
          refBits[pointer] = 0;
          pointer = (pointer + 1) % framesCount;
        }
        const removed = frames[pointer];
        frames[pointer] = p;
        refBits[pointer] = 0;
        pointer = (pointer + 1) % framesCount;
        logMsg(`Page ${p} replaced Page ${removed}. (Fault)`, 'log-danger');
      }
    }
    history.push([...frames]);
  }
  return { faults, hits, history, status };
}

function runOptimal(pages, framesCount) {
  let frames = [];
  let faults = 0;
  let hits = 0;
  let history = [];
  let status = [];
  
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    
    if (frames.includes(p)) {
      hits++;
      status.push('hit');
      logMsg(`Page ${p} already in memory. (Hit)`, 'log-success');
    } else {
      faults++;
      status.push('fault');
      if (frames.length < framesCount) {
        frames.push(p);
        logMsg(`Page ${p} loaded into empty frame. (Fault)`, 'log-warn');
      } else {
        // Find page to replace (furthest in future)
        let replaceIdx = -1;
        let furthest = -1;
        
        for (let j = 0; j < frames.length; j++) {
          let nextUse = pages.indexOf(frames[j], i + 1);
          if (nextUse === -1) {
            replaceIdx = j;
            break; // Never used again
          }
          if (nextUse > furthest) {
            furthest = nextUse;
            replaceIdx = j;
          }
        }
        
        const removed = frames[replaceIdx];
        frames[replaceIdx] = p;
        logMsg(`Page ${p} replaced Page ${removed}. (Fault)`, 'log-danger');
      }
    }
    history.push([...frames]);
  }
  return { faults, hits, history, status };
}

/* ── RENDERING ── */

function renderTable(pages, history, status) {
  let html = '<table class="pr-table">';
  
  // Header row (Reference String)
  html += '<tr><td style="border:none;"></td>';
  for (let p of pages) {
    html += `<td class="pr-ref">${p}</td>`;
  }
  html += '</tr>';
  
  // Frame rows
  for (let f = 0; f < numFrames; f++) {
    html += `<tr><td style="font-size:0.7rem; font-weight:800; color:var(--muted); border:none; text-align:right; padding-right:8px;">F${f}</td>`;
    for (let step = 0; step < history.length; step++) {
      const state = history[step];
      const val = state[f];
      
      let cls = 'pr-cell';
      if (val !== undefined) cls += ' filled';
      
      // Highlight the exact cell that caused a fault or hit if it's the top of the stack/newest
      // For visual simplicity, if it's the requested page, we highlight it
      if (val === pages[step]) {
         cls += status[step] === 'hit' ? ' hit' : ' fault';
      }
      
      html += `<td class="${cls}">${val !== undefined ? val : ''}</td>`;
    }
    html += '</tr>';
  }
  
  // Status row
  html += '<tr><td style="border:none;"></td>';
  for (let s of status) {
    html += `<td class="pr-status ${s === 'hit' ? 'status-hit' : 'status-fault'}">${s === 'hit' ? 'H' : 'F'}</td>`;
  }
  html += '</tr>';
  
  html += '</table>';
  tableContainer.innerHTML = html;
}
