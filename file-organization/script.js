'use strict';

const $ = id => document.getElementById(id);

/* ── DOM ELEMENTS ── */
const algoSelect = $('algo-select');
const cmdForm = $('cmd-form');
const cmdInput = $('cmd-input');
const cmdLog = $('cmd-log');
const clearBtn = $('clear-btn');
const vizTitle = $('viz-title');
const pwdStatus = $('pwd-status');

const canvas = $('fsCanvas');
const ctx = canvas.getContext('2d');

/* ── STATE ── */
let root = { name: 'root', type: 'dir', children: [], parent: null };
let currentDir = root;
let mode = 'SINGLE'; // SINGLE, TWO, TREE

/* ── INITIALIZATION ── */
function initFS() {
  root = { name: 'root', type: 'dir', children: [], parent: null };
  currentDir = root;
  updatePWD();
  drawTree();
}
initFS();

/* ── EVENT LISTENERS ── */
algoSelect.addEventListener('change', (e) => {
  mode = e.target.value;
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text;
  initFS();
  logMsg(`Switched to ${mode} mode. Filesystem reset.`, 'log-warn');
});

clearBtn.addEventListener('click', () => {
  initFS();
  logMsg('Filesystem reset.', 'log-warn');
});

cmdForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = cmdInput.value.trim();
  if (!raw) return;
  
  logMsg(`$ ${raw}`, 'log-info');
  cmdInput.value = '';
  
  const parts = raw.split(' ').filter(Boolean);
  const cmd = parts[0].toLowerCase();
  const arg = parts[1];
  
  handleCommand(cmd, arg);
});

/* ── CANVAS SETUP ── */
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  drawTree();
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

/* ── LOGIC ── */
function logMsg(msg, cls = 'log-muted') {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = msg;
  cmdLog.appendChild(d);
  cmdLog.scrollTop = cmdLog.scrollHeight;
}

function updatePWD() {
  let path = [];
  let curr = currentDir;
  while (curr) {
    if (curr.name === 'root') path.unshift('/');
    else path.unshift(curr.name + '/');
    curr = curr.parent;
  }
  let pStr = path.join('').replace('//', '/');
  pwdStatus.textContent = pStr;
}

function handleCommand(cmd, arg) {
  if (cmd === 'touch') {
    if (!arg) return logMsg('Usage: touch <filename>', 'log-error');
    if (mode === 'TWO' && currentDir === root) return logMsg('Cannot create file in root in Two-Level dir.', 'log-error');
    
    if (currentDir.children.find(c => c.name === arg)) return logMsg('Name already exists.', 'log-error');
    
    currentDir.children.push({ name: arg, type: 'file', parent: currentDir, children: [] });
    drawTree();
    
  } else if (cmd === 'mkdir') {
    if (!arg) return logMsg('Usage: mkdir <dirname>', 'log-error');
    if (mode === 'SINGLE') return logMsg('Cannot create directories in Single-Level mode.', 'log-error');
    if (mode === 'TWO' && currentDir !== root) return logMsg('Cannot create sub-directories in Two-Level mode.', 'log-error');
    
    if (currentDir.children.find(c => c.name === arg)) return logMsg('Name already exists.', 'log-error');
    
    currentDir.children.push({ name: arg, type: 'dir', parent: currentDir, children: [] });
    drawTree();
    
  } else if (cmd === 'rm') {
    if (!arg) return logMsg('Usage: rm <name>', 'log-error');
    const idx = currentDir.children.findIndex(c => c.name === arg);
    if (idx === -1) return logMsg(`"${arg}" not found.`, 'log-error');
    
    currentDir.children.splice(idx, 1);
    drawTree();
    
  } else if (cmd === 'cd') {
    if (!arg) return logMsg('Usage: cd <dirname>', 'log-error');
    if (mode === 'SINGLE') return logMsg('No directories to cd into.', 'log-error');
    
    if (arg === '..') {
      if (currentDir.parent) {
        currentDir = currentDir.parent;
        updatePWD();
        drawTree();
      }
      return;
    }
    
    const target = currentDir.children.find(c => c.name === arg);
    if (!target) return logMsg(`Directory "${arg}" not found.`, 'log-error');
    if (target.type !== 'dir') return logMsg(`"${arg}" is not a directory.`, 'log-error');
    
    currentDir = target;
    updatePWD();
    drawTree();
    
  } else {
    logMsg(`Command not found: ${cmd}`, 'log-error');
  }
}

/* ── DRAWING ── */

function drawTree() {
  if (!ctx) return;
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  ctx.clearRect(0, 0, w, h);
  
  // Assign positions using a simple layout
  // We'll calculate depths and widths
  
  let layout = []; // array of levels
  
  function calcPositions(node, depth, xStart, xEnd) {
    if (!layout[depth]) layout[depth] = [];
    
    const x = xStart + (xEnd - xStart) / 2;
    const y = 40 + depth * 80;
    
    node.x = x;
    node.y = y;
    layout[depth].push(node);
    
    if (node.children.length > 0) {
      const step = (xEnd - xStart) / node.children.length;
      node.children.forEach((child, i) => {
        calcPositions(child, depth + 1, xStart + i * step, xStart + (i + 1) * step);
      });
    }
  }
  
  calcPositions(root, 0, 0, w);
  
  // Draw lines
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  
  function drawLines(node) {
    node.children.forEach(child => {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y + 15);
      ctx.lineTo(child.x, child.y - 15);
      ctx.stroke();
      drawLines(child);
    });
  }
  drawLines(root);
  
  // Draw Nodes
  function drawNodes(node) {
    // Current Dir highlight
    if (node === currentDir) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(22,163,74,0.15)';
      ctx.fill();
    }
    
    if (node.type === 'dir') {
      // Folder shape
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(node.x - 15, node.y - 12, 30, 24);
      // Folder tab
      ctx.fillRect(node.x - 15, node.y - 16, 12, 8);
    } else {
      // File shape (circle)
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14, 0, Math.PI*2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }
    
    // Label
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, node.x, node.y + 30);
    
    node.children.forEach(drawNodes);
  }
  drawNodes(root);
}
