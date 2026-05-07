'use strict';

const $ = id => document.getElementById(id);

let memoryBlocks = []; // { id: 1, size: 100 }
let processes = []; // { id: 1, size: 212 }

let blockCounter = 1;
let procCounter = 1;

/* ── DOM ELEMENTS ── */
const blockSizeInput = $('block-size');
const addBlockBtn = $('add-block-btn');
const blockTags = $('block-tags');

const procSizeInput = $('proc-size');
const addProcBtn = $('add-proc-btn');
const procTags = $('proc-tags');

const algoSelect = $('algo-select');
const runBtn = $('run-btn');
const clearBtn = $('clear-btn');
const preset1Btn = $('preset-1');

const memGrid = $('mem-grid');
const procQueueDisplay = $('proc-queue-display');
const termLog = $('terminal-log');
const vizTitle = $('viz-title');
const simStatus = $('sim-status');

const statAlloc = $('stat-allocated');
const statIntFrag = $('stat-int-frag');
const statExtFrag = $('stat-ext-frag');

/* ── EVENT LISTENERS ── */
algoSelect.addEventListener('change', (e) => {
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text + ' Allocation';
});

addBlockBtn.addEventListener('click', () => {
  const size = parseInt(blockSizeInput.value);
  if (size > 0) addBlock(size);
  blockSizeInput.value = '';
});

addProcBtn.addEventListener('click', () => {
  const size = parseInt(procSizeInput.value);
  if (size > 0) addProcess(size);
  procSizeInput.value = '';
});

clearBtn.addEventListener('click', () => {
  memoryBlocks = [];
  processes = [];
  blockCounter = 1;
  procCounter = 1;
  renderTags();
  renderInitialState();
  logMsg('System cleared.', 'log-muted');
});

preset1Btn.addEventListener('click', loadPreset);
runBtn.addEventListener('click', runAllocation);

/* ── UI FUNCTIONS ── */

function addBlock(size) {
  memoryBlocks.push({ id: blockCounter++, size });
  renderTags();
  renderInitialState();
}

function addProcess(size) {
  processes.push({ id: procCounter++, size });
  renderTags();
  renderInitialState();
}

function removeBlock(idx) {
  memoryBlocks.splice(idx, 1);
  renderTags();
  renderInitialState();
}

function removeProcess(idx) {
  processes.splice(idx, 1);
  renderTags();
  renderInitialState();
}

function renderTags() {
  blockTags.innerHTML = '';
  memoryBlocks.forEach((b, i) => {
    const tag = document.createElement('div');
    tag.className = 'edge-tag';
    tag.innerHTML = `Block ${b.id}: <b>${b.size} KB</b> <span class="rm">×</span>`;
    tag.querySelector('.rm').onclick = () => removeBlock(i);
    blockTags.appendChild(tag);
  });

  procTags.innerHTML = '';
  processes.forEach((p, i) => {
    const tag = document.createElement('div');
    tag.className = 'edge-tag';
    tag.innerHTML = `P${p.id}: <b>${p.size} KB</b> <span class="rm">×</span>`;
    tag.querySelector('.rm').onclick = () => removeProcess(i);
    procTags.appendChild(tag);
  });
}

function loadPreset() {
  memoryBlocks = [
    { id: 1, size: 100 },
    { id: 2, size: 500 },
    { id: 3, size: 200 },
    { id: 4, size: 300 },
    { id: 5, size: 600 }
  ];
  processes = [
    { id: 1, size: 212 },
    { id: 2, size: 417 },
    { id: 3, size: 112 },
    { id: 4, size: 426 }
  ];
  blockCounter = 6;
  procCounter = 5;
  renderTags();
  renderInitialState();
  logMsg('Loaded Standard Preset.', 'log-info');
}

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

function renderInitialState() {
  // Render memory grid empty
  memGrid.innerHTML = '';
  if (memoryBlocks.length === 0) {
    memGrid.innerHTML = '<span class="unallocated-text" style="width: 100%;">No memory blocks added.</span>';
  } else {
    memoryBlocks.forEach(b => {
      const div = document.createElement('div');
      div.className = 'mem-block';
      div.innerHTML = `
        <div class="mem-header">Block ${b.id} (${b.size} KB)</div>
        <div class="mem-content">
          <span class="unallocated-text">Free</span>
        </div>
      `;
      memGrid.appendChild(div);
    });
  }

  // Render process queue
  procQueueDisplay.innerHTML = '';
  if (processes.length === 0) {
    procQueueDisplay.innerHTML = '<span class="unallocated-text">No processes added.</span>';
  } else {
    processes.forEach(p => {
      const div = document.createElement('div');
      div.className = 'proc-chip';
      div.textContent = `P${p.id} (${p.size} KB)`;
      procQueueDisplay.appendChild(div);
    });
  }
  
  statAlloc.textContent = `0/${processes.length}`;
  statIntFrag.textContent = '0 KB';
  statExtFrag.textContent = '0 KB';
  simStatus.textContent = 'IDLE';
  simStatus.style.color = 'var(--muted)';
}

/* ── ALLOCATION LOGIC ── */

function runAllocation() {
  if (memoryBlocks.length === 0 || processes.length === 0) return alert("Please add both memory blocks and processes.");
  
  clearLog();
  logMsg(`Running ${algoSelect.options[algoSelect.selectedIndex].text}...`, 'log-info');
  
  simStatus.textContent = 'RUNNING';
  simStatus.style.color = 'var(--warn)';

  // Setup state arrays
  const alloc = Array(processes.length).fill(-1); // alloc[i] = block_index
  const blockUsed = Array(memoryBlocks.length).fill(false);
  const blockSpace = memoryBlocks.map(b => b.size);
  
  const algo = algoSelect.value;
  
  for (let i = 0; i < processes.length; i++) {
    const pSize = processes[i].size;
    let bestIdx = -1;
    
    if (algo === 'FIRST') {
      for (let j = 0; j < memoryBlocks.length; j++) {
        if (!blockUsed[j] && blockSpace[j] >= pSize) {
          bestIdx = j;
          break;
        }
      }
    } else if (algo === 'BEST') {
      let minDiff = Infinity;
      for (let j = 0; j < memoryBlocks.length; j++) {
        if (!blockUsed[j] && blockSpace[j] >= pSize) {
          if (blockSpace[j] - pSize < minDiff) {
            minDiff = blockSpace[j] - pSize;
            bestIdx = j;
          }
        }
      }
    } else if (algo === 'WORST') {
      let maxDiff = -1;
      for (let j = 0; j < memoryBlocks.length; j++) {
        if (!blockUsed[j] && blockSpace[j] >= pSize) {
          if (blockSpace[j] - pSize > maxDiff) {
            maxDiff = blockSpace[j] - pSize;
            bestIdx = j;
          }
        }
      }
    }
    
    if (bestIdx !== -1) {
      alloc[i] = bestIdx;
      blockUsed[bestIdx] = true;
      logMsg(`P${processes[i].id} (${pSize} KB) &rarr; <span style="color:var(--safe)">Block ${memoryBlocks[bestIdx].id}</span>`, '');
    } else {
      logMsg(`P${processes[i].id} (${pSize} KB) &rarr; <span style="color:var(--danger)">Failed to allocate</span>`, '');
    }
  }
  
  renderResults(alloc, blockSpace, blockUsed);
}

function renderResults(alloc, blockSpace, blockUsed) {
  let intFrag = 0;
  let extFrag = 0;
  let allocatedCount = 0;
  
  // Total free space available across all unused blocks
  let totalFreeSpace = 0;
  for (let i = 0; i < memoryBlocks.length; i++) {
    if (!blockUsed[i]) totalFreeSpace += blockSpace[i];
  }

  // Check if any unallocated process COULD have fit if memory was contiguous (External Fragmentation condition)
  let extFragOccurred = false;
  for (let i = 0; i < processes.length; i++) {
    if (alloc[i] === -1 && processes[i].size <= totalFreeSpace) {
      extFragOccurred = true;
      break;
    }
  }
  
  if (extFragOccurred) {
    extFrag = totalFreeSpace;
    logMsg(`External Fragmentation detected: ${extFrag} KB`, 'log-warn');
  }

  // Render Memory Blocks
  memGrid.innerHTML = '';
  for (let i = 0; i < memoryBlocks.length; i++) {
    const b = memoryBlocks[i];
    const div = document.createElement('div');
    div.className = 'mem-block';
    
    let contentHtml = '';
    
    // Find if a process is allocated here
    const pIdx = alloc.indexOf(i);
    if (pIdx !== -1) {
      const p = processes[pIdx];
      const frag = b.size - p.size;
      intFrag += frag;
      
      const pPct = Math.max(20, (p.size / b.size) * 100);
      
      contentHtml = `
        <div class="mem-content">
          ${frag > 0 ? `<div class="mem-frag">${frag} KB Free (Int. Frag)</div>` : ''}
          <div class="mem-allocated" style="height: ${pPct}%;">P${p.id}<br><span style="font-size:0.6rem">${p.size} KB</span></div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="mem-content">
          <span class="unallocated-text">Free (${b.size} KB)</span>
        </div>
      `;
    }
    
    div.innerHTML = `
      <div class="mem-header">Block ${b.id} (${b.size} KB)</div>
      ${contentHtml}
    `;
    memGrid.appendChild(div);
  }

  // Render Process Queue highlighting
  procQueueDisplay.innerHTML = '';
  processes.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'proc-chip';
    if (alloc[i] !== -1) {
      div.textContent = `P${p.id} ✓`;
      div.style.background = 'var(--safe-soft)';
      div.style.borderColor = 'var(--safe)';
      div.style.color = 'var(--safe)';
      allocatedCount++;
    } else {
      div.textContent = `P${p.id} ✗`;
      div.classList.add('failed');
    }
    procQueueDisplay.appendChild(div);
  });
  
  statAlloc.textContent = `${allocatedCount}/${processes.length}`;
  statIntFrag.textContent = `${intFrag} KB`;
  statExtFrag.textContent = `${extFrag} KB`;
  
  simStatus.textContent = 'DONE';
  simStatus.style.color = 'var(--safe)';
  logMsg('Allocation complete.', 'log-success');
}

// Init
renderInitialState();
