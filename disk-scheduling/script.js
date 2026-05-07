'use strict';

const $ = id => document.getElementById(id);

/* ── DOM ELEMENTS ── */
const algoSelect = $('algo-select');
const dirSelect = $('direction-select');
const dirContainer = $('dir-container');
const maxCylInput = $('max-cyl');
const initHeadInput = $('init-head');
const reqQueueInput = $('req-queue');
const randomBtn = $('random-btn');
const runBtn = $('run-btn');

const vizTitle = $('viz-title');
const simStatus = $('sim-status');
const statTotal = $('stat-total');
const statAvg = $('stat-avg');

const canvas = $('diskCanvas');
const ctx = canvas.getContext('2d');

/* ── EVENT LISTENERS ── */
algoSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  vizTitle.textContent = e.target.options[e.target.selectedIndex].text;
  if (['SCAN', 'CSCAN', 'LOOK', 'CLOOK'].includes(val)) {
    dirContainer.style.display = 'block';
  } else {
    dirContainer.style.display = 'none';
  }
});

randomBtn.addEventListener('click', () => {
  const max = parseInt(maxCylInput.value) || 199;
  const len = Math.floor(Math.random() * 5) + 5; // 5 to 10
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(Math.floor(Math.random() * (max + 1)));
  }
  reqQueueInput.value = arr.join(', ');
});

runBtn.addEventListener('click', runSimulation);

/* ── CANVAS SETUP ── */
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}
window.addEventListener('resize', resizeCanvas);
// Initial resize
setTimeout(resizeCanvas, 100);

/* ── ALGORITHMS ── */

function runSimulation() {
  const maxCyl = parseInt(maxCylInput.value);
  const initHead = parseInt(initHeadInput.value);
  const rawReqs = reqQueueInput.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  
  if (isNaN(maxCyl) || maxCyl < 10) return alert('Invalid Max Cylinder.');
  if (isNaN(initHead) || initHead < 0 || initHead > maxCyl) return alert('Invalid Initial Head.');
  if (rawReqs.length === 0) return alert('Queue is empty.');
  
  simStatus.textContent = 'RUNNING';
  simStatus.style.color = 'var(--warn)';
  
  const algo = algoSelect.value;
  const dir = dirSelect.value; // 'up' or 'down'
  let seq = [];
  
  if (algo === 'FCFS') seq = runFCFS(initHead, rawReqs);
  else if (algo === 'SSTF') seq = runSSTF(initHead, rawReqs);
  else if (algo === 'SCAN') seq = runSCAN(initHead, rawReqs, maxCyl, dir);
  else if (algo === 'CSCAN') seq = runCSCAN(initHead, rawReqs, maxCyl, dir);
  else if (algo === 'LOOK') seq = runLOOK(initHead, rawReqs, dir);
  else if (algo === 'CLOOK') seq = runCLOOK(initHead, rawReqs, dir);
  
  // Calculate Movement
  let totalMove = 0;
  for (let i = 1; i < seq.length; i++) {
    totalMove += Math.abs(seq[i] - seq[i-1]);
  }
  
  statTotal.textContent = totalMove;
  statAvg.textContent = (totalMove / rawReqs.length).toFixed(2);
  
  drawGraph(seq, maxCyl);
  
  simStatus.textContent = 'DONE';
  simStatus.style.color = 'var(--safe)';
}

function runFCFS(head, reqs) {
  return [head, ...reqs];
}

function runSSTF(head, reqs) {
  const seq = [head];
  const pending = [...reqs];
  let curr = head;
  
  while (pending.length > 0) {
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < pending.length; i++) {
      const diff = Math.abs(pending[i] - curr);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    curr = pending.splice(closestIdx, 1)[0];
    seq.push(curr);
  }
  return seq;
}

function runSCAN(head, reqs, max, dir) {
  let left = reqs.filter(r => r < head).sort((a,b) => a-b);
  let right = reqs.filter(r => r >= head).sort((a,b) => a-b);
  const seq = [head];
  
  if (dir === 'up') {
    for (let r of right) seq.push(r);
    if (left.length > 0) {
      if (seq[seq.length-1] !== max) seq.push(max);
      for (let i = left.length - 1; i >= 0; i--) seq.push(left[i]);
    }
  } else {
    for (let i = left.length - 1; i >= 0; i--) seq.push(left[i]);
    if (right.length > 0) {
      if (seq[seq.length-1] !== 0) seq.push(0);
      for (let r of right) seq.push(r);
    }
  }
  return seq;
}

function runCSCAN(head, reqs, max, dir) {
  let left = reqs.filter(r => r < head).sort((a,b) => a-b);
  let right = reqs.filter(r => r >= head).sort((a,b) => a-b);
  const seq = [head];
  
  if (dir === 'up') {
    for (let r of right) seq.push(r);
    if (left.length > 0) {
      if (seq[seq.length-1] !== max) seq.push(max);
      seq.push(0); // Jump
      for (let r of left) seq.push(r);
    }
  } else {
    for (let i = left.length - 1; i >= 0; i--) seq.push(left[i]);
    if (right.length > 0) {
      if (seq[seq.length-1] !== 0) seq.push(0);
      seq.push(max); // Jump
      for (let i = right.length - 1; i >= 0; i--) seq.push(right[i]);
    }
  }
  return seq;
}

function runLOOK(head, reqs, dir) {
  let left = reqs.filter(r => r < head).sort((a,b) => a-b);
  let right = reqs.filter(r => r >= head).sort((a,b) => a-b);
  const seq = [head];
  
  if (dir === 'up') {
    for (let r of right) seq.push(r);
    for (let i = left.length - 1; i >= 0; i--) seq.push(left[i]);
  } else {
    for (let i = left.length - 1; i >= 0; i--) seq.push(left[i]);
    for (let r of right) seq.push(r);
  }
  return seq;
}

function runCLOOK(head, reqs, dir) {
  let left = reqs.filter(r => r < head).sort((a,b) => a-b);
  let right = reqs.filter(r => r >= head).sort((a,b) => a-b);
  const seq = [head];
  
  if (dir === 'up') {
    for (let r of right) seq.push(r);
    for (let r of left) seq.push(r);
  } else {
    for (let i = left.length - 1; i >= 0; i--) seq.push(left[i]);
    for (let i = right.length - 1; i >= 0; i--) seq.push(right[i]);
  }
  return seq;
}

/* ── DRAWING ── */

function drawGraph(seq, maxCyl) {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  
  ctx.clearRect(0, 0, w, h);
  
  const padTop = 30;
  const padBot = 30;
  const padSide = 40;
  
  const drawW = w - padSide * 2;
  const drawH = h - padTop - padBot;
  
  // Draw Grid Lines (0, max/2, max)
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  const x0 = padSide;
  const xMid = padSide + drawW / 2;
  const xMax = padSide + drawW;
  
  [x0, xMid, xMax].forEach(x => {
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, h - padBot);
  });
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('0', x0, padTop - 10);
  ctx.fillText(Math.round(maxCyl / 2).toString(), xMid, padTop - 10);
  ctx.fillText(maxCyl.toString(), xMax, padTop - 10);
  
  // Draw Sequence
  if (seq.length === 0) return;
  
  ctx.strokeStyle = '#6366f1'; // Indigo
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  
  const stepY = drawH / (seq.length - 1 || 1);
  const points = [];
  
  seq.forEach((cyl, i) => {
    const x = padSide + (cyl / maxCyl) * drawW;
    const y = padTop + i * stepY;
    points.push({x, y, cyl, isInit: i===0});
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // Draw Nodes
  points.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = pt.isInit ? '#16a34a' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = pt.isInit ? '#16a34a' : '#6366f1';
    ctx.stroke();
    
    // Node Labels
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = pt.x > xMid ? 'right' : 'left';
    ctx.fillText(pt.cyl.toString(), pt.x + (pt.x > xMid ? -10 : 10), pt.y + 4);
  });
}
