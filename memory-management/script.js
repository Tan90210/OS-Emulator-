'use strict';

const $ = id => document.getElementById(id);

/* ── DOM ELEMENTS ── */
const totalMemInput = $('total-mem');
const unpartitionedMemEl = $('unpartitioned-mem');

const blockSizeInput = $('block-size');
const addBlockBtn = $('add-block-btn');
const blockTags = $('block-tags');

const procNameInput = $('proc-name');
const procSizeInput = $('proc-size');
const addProcBtn = $('add-proc-btn');
const procTags = $('proc-tags');

const runBtn = $('run-btn');
const clearBtn = $('clear-btn');

const statInt = $('stat-int');
const statExt = $('stat-ext');
const memGrid = $('mem-grid');
const termLog = $('terminal-log');
const simStatus = $('sim-status');

/* ── STATE ── */
let totalMem = 1000;
let blocks = []; // { id, size }
let procs = [];  // { id, name, size }
let blockIdCounter = 1;
let procIdCounter = 1;

/* ── EVENT LISTENERS ── */

totalMemInput.addEventListener('input', () => {
  totalMem = parseInt(totalMemInput.value) || 0;
  updateUnpartitioned();
});

addBlockBtn.addEventListener('click', () => {
  const size = parseInt(blockSizeInput.value);
  if (isNaN(size) || size <= 0) return alert('Enter a valid block size > 0');
  
  const currentSum = blocks.reduce((acc, b) => acc + b.size, 0);
  if (currentSum + size > totalMem) {
    return alert(`Cannot add block of ${size} KB. Exceeds total memory of ${totalMem} KB.`);
  }
  
  blocks.push({ id: blockIdCounter++, size });
  blockSizeInput.value = '';
  renderTags();
  updateUnpartitioned();
});

addProcBtn.addEventListener('click', () => {
  const name = procNameInput.value.trim() || `P${procIdCounter}`;
  const size = parseInt(procSizeInput.value);
  if (isNaN(size) || size <= 0) return alert('Enter a valid process size > 0');
  
  procs.push({ id: procIdCounter++, name, size });
  procNameInput.value = '';
  procSizeInput.value = '';
  renderTags();
});

clearBtn.addEventListener('click', () => {
  blocks = [];
  procs = [];
  blockIdCounter = 1;
  procIdCounter = 1;
  renderTags();
  updateUnpartitioned();
  
  statInt.textContent = '0 KB';
  statExt.textContent = '0 KB';
  memGrid.innerHTML = '<span style="font-size:0.8rem; color:var(--muted);">Add blocks and run the calculator.</span>';
  clearLog();
  logMsg('System reset.', 'log-warn');
  simStatus.textContent = 'IDLE';
  simStatus.style.color = 'var(--muted)';
});

runBtn.addEventListener('click', runCalculator);

/* ── LOGIC & RENDERING ── */

function updateUnpartitioned() {
  const sum = blocks.reduce((acc, b) => acc + b.size, 0);
  const remaining = totalMem - sum;
  unpartitionedMemEl.textContent = remaining;
  if (remaining < 0) {
    unpartitionedMemEl.style.color = 'var(--danger)';
  } else {
    unpartitionedMemEl.style.color = 'var(--ink)';
  }
}

function renderTags() {
  blockTags.innerHTML = '';
  blocks.forEach((b, i) => {
    const t = document.createElement('div');
    t.className = 'file-tag';
    t.innerHTML = `B${b.id} (${b.size}KB) <span class="rm" style="cursor:pointer; margin-left:auto;">×</span>`;
    t.querySelector('.rm').onclick = () => { blocks.splice(i, 1); renderTags(); updateUnpartitioned(); };
    blockTags.appendChild(t);
  });
  
  procTags.innerHTML = '';
  procs.forEach((p, i) => {
    const t = document.createElement('div');
    t.className = 'file-tag';
    t.innerHTML = `${p.name} (${p.size}KB) <span class="rm" style="cursor:pointer; margin-left:auto;">×</span>`;
    t.querySelector('.rm').onclick = () => { procs.splice(i, 1); renderTags(); };
    procTags.appendChild(t);
  });
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

function runCalculator() {
  clearLog();
  if (blocks.length === 0) return alert("Please add at least one memory block.");
  
  simStatus.textContent = 'CALCULATING...';
  simStatus.style.color = 'var(--warn)';
  
  // Clone blocks for allocation state
  let mem = blocks.map(b => ({ ...b, allocatedTo: null, intFrag: 0 }));
  let rejectedProcs = [];
  
  let totalIntFrag = 0;
  
  // First-Fit Allocation
  procs.forEach(p => {
    let allocated = false;
    for (let i = 0; i < mem.length; i++) {
      if (mem[i].allocatedTo === null && mem[i].size >= p.size) {
        mem[i].allocatedTo = p;
        mem[i].intFrag = mem[i].size - p.size;
        totalIntFrag += mem[i].intFrag;
        allocated = true;
        logMsg(`Allocated ${p.name} (${p.size} KB) to Block ${mem[i].id}. Internal Frag: ${mem[i].intFrag} KB`, 'log-success');
        break;
      }
    }
    if (!allocated) {
      rejectedProcs.push(p);
      logMsg(`Failed to allocate ${p.name} (${p.size} KB). No large enough contiguous block.`, 'log-danger');
    }
  });
  
  // External Fragmentation Calculation
  const unpartitioned = totalMem - blocks.reduce((acc, b) => acc + b.size, 0);
  const unallocatedBlocksSize = mem.filter(m => m.allocatedTo === null).reduce((acc, m) => acc + m.size, 0);
  
  const totalFreeMemory = unpartitioned + unallocatedBlocksSize;
  
  let hasExternalFrag = false;
  // If there's any rejected process whose size <= total Free Memory, we have external frag.
  for (let rp of rejectedProcs) {
    if (rp.size <= totalFreeMemory) {
      hasExternalFrag = true;
      break;
    }
  }
  
  let extFragVal = hasExternalFrag ? totalFreeMemory : 0;
  
  statInt.textContent = `${totalIntFrag} KB`;
  statExt.textContent = `${extFragVal} KB`;
  
  if (hasExternalFrag) {
    logMsg(`External Fragmentation Occurred! Total Free Space is ${totalFreeMemory} KB, but could not satisfy request(s).`, 'log-warn');
  } else {
    logMsg(`No External Fragmentation (or not enough total free memory to satisfy rejected processes anyway).`, 'log-muted');
  }
  
  // Render Grid
  memGrid.innerHTML = '';
  mem.forEach(m => {
    const bDiv = document.createElement('div');
    bDiv.className = 'mem-block';
    
    const h = document.createElement('div');
    h.className = 'mem-header';
    h.textContent = `Block ${m.id} (${m.size} KB)`;
    bDiv.appendChild(h);
    
    const c = document.createElement('div');
    c.className = 'mem-content';
    
    if (m.allocatedTo) {
      const heightPercent = Math.max((m.allocatedTo.size / m.size) * 100, 20);
      
      if (m.intFrag > 0) {
        const fragEl = document.createElement('div');
        fragEl.className = 'mem-frag';
        fragEl.textContent = `Int. Frag: ${m.intFrag} KB`;
        c.appendChild(fragEl);
      }
      
      const a = document.createElement('div');
      a.className = 'mem-allocated';
      a.style.height = `${heightPercent}%`;
      a.innerHTML = `${m.allocatedTo.name}<br><span style="font-size:0.65rem">${m.allocatedTo.size} KB</span>`;
      c.appendChild(a);
    } else {
      const u = document.createElement('div');
      u.className = 'mem-frag';
      u.style.flex = '1';
      u.style.display = 'flex';
      u.style.alignItems = 'center';
      u.style.justifyContent = 'center';
      u.style.color = 'var(--muted)';
      u.textContent = 'Free';
      c.appendChild(u);
    }
    
    bDiv.appendChild(c);
    memGrid.appendChild(bDiv);
  });
  
  // Unpartitioned visual block
  if (unpartitioned > 0) {
    const unPartDiv = document.createElement('div');
    unPartDiv.className = 'mem-block';
    unPartDiv.style.borderColor = 'var(--line)';
    unPartDiv.style.opacity = '0.7';
    
    unPartDiv.innerHTML = `
      <div class="mem-header" style="background:transparent;">Unpartitioned</div>
      <div class="mem-content" style="background:transparent;">
        <div class="mem-frag" style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--warn);">${unpartitioned} KB</div>
      </div>
    `;
    memGrid.appendChild(unPartDiv);
  }
  
  simStatus.textContent = 'DONE';
  simStatus.style.color = 'var(--safe)';
}
