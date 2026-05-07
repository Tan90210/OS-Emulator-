'use strict';

const $ = id => document.getElementById(id);

let totalBlocks = 64;
let files = []; // { name, size, blocks: [], colorIdx }
let disk = []; // null if free, or { fileId, type, ptr }

const colors = [
  { bg: 'rgba(99,102,241,0.15)', border: '#6366f1' }, // indigo
  { bg: 'rgba(22,163,74,0.15)', border: '#16a34a' }, // green
  { bg: 'rgba(217,119,6,0.15)', border: '#d97706' }, // amber
  { bg: 'rgba(220,38,38,0.15)', border: '#dc2626' }, // red
  { bg: 'rgba(168,85,247,0.15)', border: '#a855f7' }, // purple
  { bg: 'rgba(14,165,233,0.15)', border: '#0ea5e9' }, // sky
  { bg: 'rgba(236,72,153,0.15)', border: '#ec4899' }, // pink
  { bg: 'rgba(20,184,166,0.15)', border: '#14b8a6' }  // teal
];

/* ── DOM ELEMENTS ── */
const algoSelect = $('algo-select');
const blockIncBtn = $('block-inc');
const blockDecBtn = $('block-dec');
const blockCountEl = $('block-count');

const fileNameInput = $('file-name');
const fileSizeInput = $('file-size');
const addFileBtn = $('add-file-btn');
const fileTags = $('file-tags');
const clearBtn = $('clear-btn');

const vizTitle = $('viz-title');
const diskGrid = $('disk-grid');
const termLog = $('terminal-log');

/* ── INITIALIZATION ── */
function initDisk() {
  disk = Array(totalBlocks).fill(null);
  files = [];
  renderTags();
  renderDisk();
  clearLog();
  logMsg('System ready.', 'log-info');
}

initDisk();

/* ── EVENT LISTENERS ── */
algoSelect.addEventListener('change', (e) => {
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text;
  initDisk(); // Re-init on algo change to prevent mixing allocations
});

blockIncBtn.addEventListener('click', () => {
  if (totalBlocks < 256) {
    totalBlocks += 16;
    blockCountEl.textContent = totalBlocks;
    initDisk();
  }
});

blockDecBtn.addEventListener('click', () => {
  if (totalBlocks > 16) {
    totalBlocks -= 16;
    blockCountEl.textContent = totalBlocks;
    initDisk();
  }
});

clearBtn.addEventListener('click', initDisk);

addFileBtn.addEventListener('click', () => {
  const name = fileNameInput.value.trim();
  const size = parseInt(fileSizeInput.value);
  
  if (!name || isNaN(size) || size < 1) return alert("Valid name and size required.");
  if (files.find(f => f.name === name)) return alert("File name already exists.");
  
  allocateFile(name, size);
  fileNameInput.value = '';
  fileSizeInput.value = '';
});

/* ── ALGORITHMS ── */

function allocateFile(name, size) {
  const algo = algoSelect.value;
  const fileObj = { 
    name, 
    size, 
    blocks: [], 
    colorIdx: files.length % colors.length 
  };
  
  let success = false;
  
  if (algo === 'CONTIGUOUS') success = allocContiguous(fileObj);
  else if (algo === 'LINKED') success = allocLinked(fileObj);
  else if (algo === 'INDEXED') success = allocIndexed(fileObj);
  
  if (success) {
    files.push(fileObj);
    logMsg(`File "${name}" (${size} blocks) allocated.`, 'log-success');
    
    // Log specifics
    if (algo === 'CONTIGUOUS') {
      logMsg(`  Start: ${fileObj.blocks[0]}, Length: ${size}`, '');
    } else if (algo === 'LINKED') {
      logMsg(`  Start block: ${fileObj.blocks[0]}, End block: ${fileObj.blocks[fileObj.blocks.length-1]}`, '');
    } else if (algo === 'INDEXED') {
      logMsg(`  Index block: ${fileObj.indexBlock}`, '');
    }
  } else {
    logMsg(`Failed to allocate "${name}" (${size} blocks). Out of space.`, 'log-danger');
  }
  
  renderTags();
  renderDisk();
}

function allocContiguous(fileObj) {
  let startIdx = -1;
  let count = 0;
  
  for (let i = 0; i < totalBlocks; i++) {
    if (disk[i] === null) {
      count++;
      if (count === fileObj.size) {
        startIdx = i - count + 1;
        break;
      }
    } else {
      count = 0;
    }
  }
  
  if (startIdx !== -1) {
    for (let i = startIdx; i < startIdx + fileObj.size; i++) {
      disk[i] = { fileId: fileObj.name, type: 'data', ptr: null };
      fileObj.blocks.push(i);
    }
    return true;
  }
  return false;
}

function allocLinked(fileObj) {
  let freeBlocks = [];
  for (let i = 0; i < totalBlocks; i++) {
    if (disk[i] === null) freeBlocks.push(i);
  }
  
  if (freeBlocks.length >= fileObj.size) {
    let allocated = freeBlocks.slice(0, fileObj.size);
    for (let i = 0; i < allocated.length; i++) {
      let b = allocated[i];
      let next = i < allocated.length - 1 ? allocated[i+1] : 'EOF';
      disk[b] = { fileId: fileObj.name, type: 'data', ptr: next };
      fileObj.blocks.push(b);
    }
    return true;
  }
  return false;
}

function allocIndexed(fileObj) {
  // Need size + 1 (for index block)
  let freeBlocks = [];
  for (let i = 0; i < totalBlocks; i++) {
    if (disk[i] === null) freeBlocks.push(i);
  }
  
  if (freeBlocks.length >= fileObj.size + 1) {
    let indexBlock = freeBlocks[0];
    let dataBlocks = freeBlocks.slice(1, fileObj.size + 1);
    
    disk[indexBlock] = { fileId: fileObj.name, type: 'index', ptr: dataBlocks };
    fileObj.indexBlock = indexBlock;
    
    for (let b of dataBlocks) {
      disk[b] = { fileId: fileObj.name, type: 'data', ptr: null };
      fileObj.blocks.push(b);
    }
    return true;
  }
  return false;
}

/* ── RENDERING ── */

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

function removeFile(name) {
  // Free disk
  for (let i = 0; i < totalBlocks; i++) {
    if (disk[i] && disk[i].fileId === name) {
      disk[i] = null;
    }
  }
  files = files.filter(f => f.name !== name);
  logMsg(`File "${name}" deleted.`, 'log-warn');
  renderTags();
  renderDisk();
}

function renderTags() {
  fileTags.innerHTML = '';
  files.forEach(f => {
    const tag = document.createElement('div');
    tag.className = 'file-tag';
    
    const c = colors[f.colorIdx];
    tag.innerHTML = `
      <div class="color-dot" style="background:${c.border}"></div>
      ${f.name} <span style="color:var(--muted)">(${f.size} blk)</span>
      <span class="rm" style="cursor:pointer; margin-left:auto;">×</span>
    `;
    tag.querySelector('.rm').onclick = () => removeFile(f.name);
    fileTags.appendChild(tag);
  });
}

function renderDisk() {
  diskGrid.innerHTML = '';
  
  for (let i = 0; i < totalBlocks; i++) {
    const b = disk[i];
    const div = document.createElement('div');
    div.className = 'disk-block';
    
    // ID Label
    const idLbl = document.createElement('span');
    idLbl.className = 'block-id';
    idLbl.textContent = i;
    div.appendChild(idLbl);
    
    if (b) {
      div.classList.add('allocated');
      const fileObj = files.find(f => f.name === b.fileId);
      const c = colors[fileObj.colorIdx];
      
      div.style.backgroundColor = c.bg;
      div.style.borderColor = c.border;
      div.style.color = c.border;
      
      const titleLbl = document.createElement('span');
      titleLbl.textContent = b.fileId;
      div.appendChild(titleLbl);
      
      if (b.type === 'index') {
        div.classList.add('index');
        titleLbl.textContent += ' [Idx]';
        titleLbl.style.fontSize = '0.65rem';
      }
      
      if (b.ptr !== null && b.type !== 'index') {
        const ptrLbl = document.createElement('span');
        ptrLbl.className = 'block-ptr';
        ptrLbl.textContent = `→ ${b.ptr}`;
        div.appendChild(ptrLbl);
      }
    }
    
    diskGrid.appendChild(div);
  }
}
