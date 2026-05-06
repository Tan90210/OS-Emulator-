'use strict';

/* ─── UTILITY ─────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
function log(termId, msg, cls = 'log-muted') {
  const t = $(termId);
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = '> ' + msg;
  t.appendChild(d);
  t.scrollTop = t.scrollHeight;
}

/* ─── TAB SWITCHING ───────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  $('panel-' + tab).classList.add('active');
  $('tab-' + tab).classList.add('active');
  $('nav-label').textContent = tab === 'rag' ? 'RAG_DEADLOCK' : 'BANKERS_ALGO';
  if (tab === 'rag') ragDrawCanvas();
}

/* ══════════════════════════════════════════════════════════
   MODULE 1 — RAG DEADLOCK DETECTION
   Based on: l6 (1).c — DFS cycle detection on adjacency matrix
══════════════════════════════════════════════════════════ */

const R = {
  numProc: 3, numRes: 2,
  reqEdges: [],   // {p, r}
  allocEdges: [], // {r, p}
  graph: [],
  animSpeed: 600,
  animTimer: null,
  animSteps: [],
  animIdx: 0,
  cyclePath: [],
  highlightNode: -1,
  nodePos: [],
};

/* ── Build adjacency matrix (mirrors C: graph[p][processes+r]=1) ── */
function ragBuildGraph() {
  const n = R.numProc + R.numRes;
  R.graph = Array.from({ length: n }, () => Array(n).fill(0));
  R.reqEdges.forEach(({ p, r }) => R.graph[p][R.numProc + r] = 1);
  R.allocEdges.forEach(({ r, p }) => R.graph[R.numProc + r][p] = 1);
}

/* ── DFS cycle detection — exact port of C detectCycle() ── */
function ragDetectCycle(v, vis, rec, steps) {
  if (!vis[v]) {
    vis[v] = 1; rec[v] = 1;
    steps.push({ type: 'visit', node: v, rec: [...rec], vis: [...vis] });

    for (let i = 0; i < R.numProc + R.numRes; i++) {
      if (R.graph[v][i]) {
        if (!vis[i]) {
          if (ragDetectCycle(i, vis, rec, steps)) return true;
        } else if (rec[i]) {
          steps.push({ type: 'cycle', node: i, from: v, rec: [...rec], vis: [...vis] });
          return true;
        }
      }
    }
  }
  rec[v] = 0;
  steps.push({ type: 'backtrack', node: v, rec: [...rec], vis: [...vis] });
  return false;
}

function ragRunDetection() {
  ragBuildGraph();
  const total = R.numProc + R.numRes;
  const vis = Array(total).fill(0);
  const rec = Array(total).fill(0);
  const steps = [];
  let deadlock = false;

  for (let i = 0; i < total; i++) {
    if (ragDetectCycle(i, vis, rec, steps)) { deadlock = true; break; }
  }
  return { deadlock, steps };
}

/* ── Node label helpers ── */
function ragLabel(n) { return n < R.numProc ? `P${n}` : `R${n - R.numProc}`; }

/* ── Canvas drawing ── */
function ragComputePositions() {
  const canvas = $('ragCanvas');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  R.nodePos = [];
  for (let i = 0; i < R.numProc; i++) {
    R.nodePos.push({ x: W * 0.25, y: H * 0.12 + (H * 0.76 / Math.max(R.numProc - 1, 1)) * i, type: 'P' });
  }
  for (let i = 0; i < R.numRes; i++) {
    R.nodePos.push({ x: W * 0.75, y: H * 0.15 + (H * 0.7 / Math.max(R.numRes - 1, 1)) * i, type: 'R' });
  }
}

function ragDrawCanvas() {
  const canvas = $('ragCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  ragComputePositions();
  if (R.nodePos.length === 0) return;

  const NR = 20;

  const arrow = (fi, ti, color) => {
    const f = R.nodePos[fi], t = R.nodePos[ti];
    const dx = t.x - f.x, dy = t.y - f.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const sx = f.x + (dx / len) * NR, sy = f.y + (dy / len) * NR;
    const ex = t.x - (dx / len) * NR, ey = t.y - (dy / len) * NR;
    ctx.beginPath(); ctx.setLineDash([]);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    const ang = Math.atan2(ey - sy, ex - sx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 10 * Math.cos(ang - 0.4), ey - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(ex - 10 * Math.cos(ang + 0.4), ey - 10 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };

  R.reqEdges.forEach(({ p, r }) => {
    const inCycle = R.cyclePath.includes(p) && R.cyclePath.includes(R.numProc + r);
    arrow(p, R.numProc + r, inCycle ? '#dc2626' : '#6366f1');
  });
  R.allocEdges.forEach(({ r, p }) => {
    const inCycle = R.cyclePath.includes(R.numProc + r) && R.cyclePath.includes(p);
    arrow(R.numProc + r, p, inCycle ? '#dc2626' : '#16a34a');
  });

  R.nodePos.forEach((n, i) => {
    const isHL = i === R.highlightNode;
    const inCyc = R.cyclePath.includes(i);
    if (n.type === 'P') {
      ctx.beginPath(); ctx.arc(n.x, n.y, NR, 0, Math.PI * 2);
      ctx.fillStyle = inCyc ? 'rgba(220,38,38,0.15)' : (isHL ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.09)');
      ctx.fill();
      ctx.strokeStyle = inCyc ? '#dc2626' : (isHL ? '#6366f1' : '#cbd5e1');
      ctx.lineWidth = isHL || inCyc ? 2.5 : 1.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.roundRect(n.x - NR, n.y - NR, NR * 2, NR * 2, 4);
      ctx.fillStyle = inCyc ? 'rgba(220,38,38,0.12)' : (isHL ? 'rgba(22,163,74,0.18)' : 'rgba(22,163,74,0.08)');
      ctx.fill();
      ctx.strokeStyle = inCyc ? '#dc2626' : (isHL ? '#16a34a' : '#cbd5e1');
      ctx.lineWidth = isHL || inCyc ? 2.5 : 1.5; ctx.stroke();
    }
    ctx.fillStyle = inCyc ? '#dc2626' : (isHL ? '#1e293b' : '#64748b');
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ragLabel(i), n.x, n.y);
  });
}

/* ── Adjacency matrix display ── */
function ragRenderMatrix(hiI = -1, hiJ = -1) {
  const n = R.numProc + R.numRes;
  const labels = [...Array(R.numProc).keys()].map(i => `P${i}`)
    .concat([...Array(R.numRes).keys()].map(i => `R${i}`));
  let html = '<div class="matrix-grid">';
  html += '<div class="matrix-row"><div class="matrix-cell hdr"></div>';
  labels.forEach(l => html += `<div class="matrix-cell hdr">${l}</div>`);
  html += '</div>';
  for (let i = 0; i < n; i++) {
    html += `<div class="matrix-row"><div class="matrix-cell hdr">${labels[i]}</div>`;
    for (let j = 0; j < n; j++) {
      const v = R.graph[i] ? R.graph[i][j] : 0;
      const isAct = i === hiI && j === hiJ;
      const isAl = i >= R.numProc;
      const cls = isAct ? 'hl' : (v === 1 ? (isAl ? 'one al' : 'one') : 'zero');
      html += `<div class="matrix-cell ${cls}">${v}</div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  $('r-matrix-wrap').innerHTML = html;
}

/* ── Node cards ── */
function ragRenderNodeCards() {
  const pl = $('r-proc-nodes'); pl.innerHTML = '';
  for (let i = 0; i < R.numProc; i++) {
    const reqs = R.reqEdges.filter(e => e.p === i).map(e => `P${e.p}→R${e.r}`).join(', ') || '—';
    const allocs = R.allocEdges.filter(e => e.p === i).map(e => `R${e.r}→P${e.p}`).join(', ') || '—';
    pl.innerHTML += `
      <div class="process-card" id="rpc-p${i}">
        <div class="process-card-header">
          <span class="process-id">P${i}</span>
          <span class="chip chip-idle" id="rpch-p${i}">IDLE</span>
        </div>
        <div class="process-card-sub">PROCESS</div>
        <div class="process-details">REQ: ${reqs}<br>ALLOC: ${allocs}</div>
      </div>`;
  }
  const rl = $('r-res-nodes'); rl.innerHTML = '';
  for (let i = 0; i < R.numRes; i++) {
    const allocs = R.allocEdges.filter(e => e.r === i).map(e => `R${e.r}→P${e.p}`).join(', ') || '—';
    const reqs = R.reqEdges.filter(e => e.r === i).map(e => `P${e.p}→R${e.r}`).join(', ') || '—';
    rl.innerHTML += `
      <div class="process-card" id="rpc-r${i}">
        <div class="process-card-header">
          <span class="process-id">R${i}</span>
          <span class="chip chip-idle" id="rpch-r${i}">IDLE</span>
        </div>
        <div class="process-card-sub">RESOURCE</div>
        <div class="process-details">ALLOC: ${allocs}<br>WAIT: ${reqs}</div>
      </div>`;
  }
}

function ragSetCardState(nodeIdx, state) {
  const isRes = nodeIdx >= R.numProc;
  const li = isRes ? nodeIdx - R.numProc : nodeIdx;
  const card = isRes ? $(`rpc-r${li}`) : $(`rpc-p${li}`);
  const chip = isRes ? $(`rpch-r${li}`) : $(`rpch-p${li}`);
  if (!card) return;
  card.className = 'process-card';
  chip.className = 'chip';
  const map = {
    active: ['pc-active', 'chip-active', 'VISITING'],
    deadlock: ['pc-deadlock', 'chip-deadlock', 'DEADLOCK'],
    safe: ['pc-safe', 'chip-safe', 'SAFE'],
    wait: ['pc-wait', 'chip-wait', 'IN STACK'],
    idle: ['', 'chip-idle', 'IDLE'],
  };
  const [cc, chc, cht] = map[state] || map.idle;
  if (cc) card.classList.add(cc);
  chip.classList.add(chc);
  chip.textContent = cht;
}

function ragResetCards() {
  for (let i = 0; i < R.numProc + R.numRes; i++) ragSetCardState(i, 'idle');
}

/* ── Edge tag rendering ── */
function ragRenderTags() {
  $('req-tags').innerHTML = R.reqEdges.map((e, i) =>
    `<span class="edge-tag req-tag">P${e.p}<span class="tag-arrow">→</span>R${e.r}<span class="rm" data-t="req" data-i="${i}">✕</span></span>`
  ).join('');
  $('alloc-tags').innerHTML = R.allocEdges.map((e, i) =>
    `<span class="edge-tag alloc-tag">R${e.r}<span class="tag-arrow">→</span>P${e.p}<span class="rm" data-t="alloc" data-i="${i}">✕</span></span>`
  ).join('');
  document.querySelectorAll('#req-tags .rm, #alloc-tags .rm').forEach(el => {
    el.onclick = () => {
      const i = parseInt(el.dataset.i);
      if (el.dataset.t === 'req') R.reqEdges.splice(i, 1);
      else R.allocEdges.splice(i, 1);
      ragRenderTags(); ragRefresh();
    };
  });
}

/* ── Banner ── */
function ragShowBanner(type) {  // 'deadlock' | 'safe'
  const b = $('r-banner');
  b.className = 'result-banner show ' + type;
  $('r-banner-icon').textContent = type === 'deadlock' ? '⚠' : '✓';
  $('r-banner-title').textContent = type === 'deadlock' ? 'DEADLOCK DETECTED' : 'SYSTEM IS DEADLOCK-FREE';
  $('r-banner-detail').textContent = type === 'deadlock'
    ? 'Cycle found in resource allocation graph via DFS.'
    : 'No cycle detected. All processes can proceed.';
}
function ragHideBanner() { $('r-banner').className = 'result-banner'; }

/* ── Full refresh ── */
function ragRefresh() {
  $('r-proc-count').textContent = R.numProc;
  $('r-res-count').textContent = R.numRes;
  $('r-stat-nodes').textContent = R.numProc + R.numRes;
  $('r-stat-edges').textContent = R.reqEdges.length + R.allocEdges.length;
  ragBuildGraph();
  ragRenderNodeCards();
  ragRenderMatrix();
  ragDrawCanvas();
}

/* ── INSTANT RUN ── */
$('r-runBtn').onclick = () => {
  ragBuildGraph();
  const { deadlock, steps } = ragRunDetection();
  R.cyclePath = [];

  // Parse steps to find cycle path
  const cycleStep = steps.find(s => s.type === 'cycle');
  if (cycleStep) {
    // reconstruct path from recStack at cycle point
    R.cyclePath = cycleStep.rec.map((v, i) => v ? i : -1).filter(i => i >= 0);
    R.cyclePath.push(cycleStep.node);
  }

  // DFS trace
  const trace = $('r-dfs-trace'); trace.innerHTML = '';
  steps.forEach((s, idx) => {
    const d = document.createElement('div');
    if (s.type === 'visit') {
      d.className = 'dfs-step';
      const stk = s.rec.map((v, i) => v ? ragLabel(i) : '').filter(Boolean).join(',') || '—';
      d.innerHTML = `<span class="dfs-step-num">${idx + 1}</span> VISIT ${ragLabel(s.node)} — recStack=[${stk}]`;
    } else if (s.type === 'cycle') {
      d.className = 'dfs-step cycle';
      d.innerHTML = `<span class="dfs-step-num">${idx + 1}</span> ⚠ CYCLE: ${ragLabel(s.from)}→${ragLabel(s.node)} already in recStack!`;
    } else {
      d.className = 'dfs-step';
      d.innerHTML = `<span class="dfs-step-num">${idx + 1}</span> BACKTRACK from ${ragLabel(s.node)}`;
    }
    trace.appendChild(d);
  });
  if (!cycleStep) {
    const d = document.createElement('div');
    d.className = 'dfs-step safe-step';
    d.innerHTML = `<span class="dfs-step-num">✓</span> No cycle found. System is deadlock-free.`;
    trace.appendChild(d);
  }
  trace.scrollTop = trace.scrollHeight;

  $('r-stat-cycle').textContent = deadlock ? 'YES' : 'NO';
  $('r-stat-cycle').className = 'stat-value ' + (deadlock ? 'red' : 'green');
  $('r-rag-status').textContent = deadlock ? 'DEADLOCK' : 'SAFE';
  $('r-rag-status').style.color = deadlock ? 'var(--red)' : 'var(--green)';

  ragResetCards();
  if (deadlock) {
    R.cyclePath.forEach(n => ragSetCardState(n, 'deadlock'));
    ragShowBanner('deadlock');
    log('r-terminal', 'DEADLOCK DETECTED — cycle present in RAG.', 'log-error');
  } else {
    for (let i = 0; i < R.numProc + R.numRes; i++) ragSetCardState(i, 'safe');
    ragShowBanner('safe');
    log('r-terminal', 'System is deadlock-free.', 'log-success');
  }
  ragRenderMatrix();
  ragDrawCanvas();
};

/* ── ANIMATED DFS ── */
$('r-animBtn').onclick = () => {
  if (R.animTimer) {
    clearInterval(R.animTimer); R.animTimer = null;
    $('r-animBtn').textContent = '▶ ANIMATE DFS'; return;
  }
  ragBuildGraph();
  R.cyclePath = []; R.highlightNode = -1;
  ragResetCards(); ragHideBanner();
  $('r-dfs-trace').innerHTML = '';
  $('r-dfs-stack').innerHTML = '<span class="queue-empty">—</span>';

  const { deadlock, steps } = ragRunDetection();
  R.animSteps = steps; R.animIdx = 0;
  $('r-animBtn').textContent = '⏸ PAUSE';

  R.animTimer = setInterval(() => {
    if (R.animIdx >= R.animSteps.length) {
      clearInterval(R.animTimer); R.animTimer = null;
      $('r-animBtn').textContent = '▶ ANIMATE DFS';
      ragShowBanner(deadlock ? 'deadlock' : 'safe');
      $('r-stat-cycle').textContent = deadlock ? 'YES' : 'NO';
      $('r-stat-cycle').className = 'stat-value ' + (deadlock ? 'red' : 'green');
      if (!deadlock) for (let i = 0; i < R.numProc + R.numRes; i++) ragSetCardState(i, 'safe');
      log('r-terminal', deadlock ? 'Animation done — DEADLOCK.' : 'Animation done — no deadlock.', deadlock ? 'log-error' : 'log-success');
      return;
    }

    const s = R.animSteps[R.animIdx++];
    R.highlightNode = s.node;

    const trace = $('r-dfs-trace');
    const d = document.createElement('div');
    d.className = 'dfs-step' + (s.type === 'cycle' ? ' cycle' : '');

    if (s.type === 'visit') {
      ragSetCardState(s.node, 'active');
      s.rec.forEach((v, i) => { if (v && i !== s.node) ragSetCardState(i, 'wait'); });
      const stk = s.rec.map((v, i) => v ? ragLabel(i) : '').filter(Boolean);
      $('r-dfs-stack').innerHTML = stk.length
        ? stk.map(l => `<span class="queue-item">${l}</span>`).join('')
        : '<span class="queue-empty">—</span>';
      d.innerHTML = `<span class="dfs-step-num">${R.animIdx}</span> VISIT ${ragLabel(s.node)}`;
      log('r-terminal', `Visiting ${ragLabel(s.node)}`, 'log-info');

    } else if (s.type === 'cycle') {
      R.cyclePath = s.rec.map((v, i) => v ? i : -1).filter(i => i >= 0);
      R.cyclePath.push(s.node);
      R.cyclePath.forEach(n => ragSetCardState(n, 'deadlock'));
      $('r-dfs-stack').innerHTML = '<span class="queue-item" style="color:var(--red)">CYCLE!</span>';
      d.innerHTML = `<span class="dfs-step-num">${R.animIdx}</span> ⚠ CYCLE: ${ragLabel(s.from)}→${ragLabel(s.node)}`;
      log('r-terminal', `CYCLE DETECTED: ${ragLabel(s.from)} → ${ragLabel(s.node)}`, 'log-error');

    } else {
      ragSetCardState(s.node, 'idle');
      d.innerHTML = `<span class="dfs-step-num">${R.animIdx}</span> BACK ${ragLabel(s.node)}`;
      log('r-terminal', `Backtrack from ${ragLabel(s.node)}`, 'log-muted');
    }

    trace.appendChild(d); trace.scrollTop = trace.scrollHeight;
    ragRenderMatrix(); ragDrawCanvas();
  }, R.animSpeed);
};

/* ── CONTROLS & EVENTS ── */
$('r-proc-dec').onclick = () => { if (R.numProc > 1) { R.numProc--; ragRefresh(); } };
$('r-proc-inc').onclick = () => { if (R.numProc < 8) { R.numProc++; ragRefresh(); } };
$('r-res-dec').onclick = () => { if (R.numRes > 1) { R.numRes--; ragRefresh(); } };
$('r-res-inc').onclick = () => { if (R.numRes < 6) { R.numRes++; ragRefresh(); } };

$('req-add').onclick = () => {
  const p = parseInt($('req-p').value), r = parseInt($('req-r').value);
  if (isNaN(p) || isNaN(r) || p < 0 || p >= R.numProc || r < 0 || r >= R.numRes)
    return log('r-terminal', 'Invalid edge. Check indices.', 'log-error');
  if (R.reqEdges.find(e => e.p === p && e.r === r))
    return log('r-terminal', 'Edge already exists.', 'log-warn');
  R.reqEdges.push({ p, r }); ragRenderTags(); ragRefresh();
  log('r-terminal', `Request edge added: P${p} → R${r}`, 'log-info');
};
$('alloc-add').onclick = () => {
  const r = parseInt($('alloc-r').value), p = parseInt($('alloc-p').value);
  if (isNaN(p) || isNaN(r) || p < 0 || p >= R.numProc || r < 0 || r >= R.numRes)
    return log('r-terminal', 'Invalid edge. Check indices.', 'log-error');
  if (R.allocEdges.find(e => e.r === r && e.p === p))
    return log('r-terminal', 'Edge already exists.', 'log-warn');
  R.allocEdges.push({ r, p }); ragRenderTags(); ragRefresh();
  log('r-terminal', `Allocation edge added: R${r} → P${p}`, 'log-info');
};

// Presets
$('r-preset-dl').onclick = () => {
  R.numProc = 3; R.numRes = 2;
  R.reqEdges = [{ p: 0, r: 0 }, { p: 1, r: 1 }, { p: 2, r: 0 }];
  R.allocEdges = [{ r: 0, p: 1 }, { r: 1, p: 2 }];
  ragRenderTags(); ragRefresh();
  log('r-terminal', 'Loaded deadlock scenario: P0→R0, P1→R1, P2→R0 | R0→P1, R1→P2', 'log-warn');
};
$('r-preset-safe').onclick = () => {
  R.numProc = 3; R.numRes = 2;
  R.reqEdges = [{ p: 0, r: 0 }, { p: 2, r: 1 }];
  R.allocEdges = [{ r: 0, p: 1 }, { r: 1, p: 0 }];
  ragRenderTags(); ragRefresh();
  log('r-terminal', 'Loaded safe scenario — no cycle.', 'log-info');
};
$('r-preset-clear').onclick = () => {
  R.reqEdges = []; R.allocEdges = [];
  R.cyclePath = []; R.highlightNode = -1;
  ragRenderTags(); ragRefresh(); ragHideBanner();
  $('r-dfs-trace').innerHTML = '<div class="dfs-step"><span class="dfs-step-num">—</span> Awaiting detection run…</div>';
  $('r-dfs-stack').innerHTML = '<span class="queue-empty">—</span>';
  log('r-terminal', 'Graph cleared.', 'log-muted');
};

// Speed
document.querySelectorAll('#r-speed-btns .speed-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#r-speed-btns .speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    R.animSpeed = parseInt(btn.dataset.speed);
  };
});

$('r-resetBtn').onclick = () => {
  if (R.animTimer) { clearInterval(R.animTimer); R.animTimer = null; }
  $('r-animBtn').textContent = '▶ ANIMATE DFS';
  R.cyclePath = []; R.highlightNode = -1;
  ragResetCards(); ragHideBanner();
  $('r-stat-cycle').textContent = '—'; $('r-stat-cycle').className = 'stat-value red';
  $('r-rag-status').textContent = 'IDLE'; $('r-rag-status').style.color = '';
  $('r-dfs-trace').innerHTML = '<div class="dfs-step"><span class="dfs-step-num">—</span> Awaiting detection run…</div>';
  $('r-dfs-stack').innerHTML = '<span class="queue-empty">—</span>';
  ragBuildGraph(); ragRenderMatrix(); ragDrawCanvas();
  log('r-terminal', 'System reset.', 'log-muted');
};
$('r-clearBtn').onclick = () => {
  $('r-terminal').innerHTML = '<div class="log-muted">&gt; terminal cleared.</div>';
};

window.addEventListener('resize', () => { ragComputePositions(); ragDrawCanvas(); });


/* ══════════════════════════════════════════════════════════
   MODULE 2 — BANKER'S ALGORITHM
   Dijkstra deadlock avoidance: Need matrix + safety check
══════════════════════════════════════════════════════════ */

const B = {
  numProc: 4, numRes: 3,
  allocMat: [], maxMat: [], availVec: [],
  animSpeed: 700, animTimer: null,
  animSteps: [], animIdx: 0,
  safeSeq: [], procStates: [],
};

/* ── Input builders ── */
function bResLabels() { return Array.from({ length: B.numRes }, (_, i) => `R${i}`); }
function bProcLabels() { return Array.from({ length: B.numProc }, (_, i) => `P${i}`); }

function bBuildTable(containerId, prefix, data) {
  const rl = bProcLabels(), cl = bResLabels();
  let h = `<table class="input-table"><thead><tr><th></th>`;
  cl.forEach(l => h += `<th>${l}</th>`);
  h += `</tr></thead><tbody>`;
  for (let i = 0; i < B.numProc; i++) {
    h += `<tr><td class="proc-label">${rl[i]}</td>`;
    for (let j = 0; j < B.numRes; j++) {
      const v = data[i] && data[i][j] !== undefined ? data[i][j] : 0;
      h += `<td><input class="cell-input" id="${prefix}-${i}-${j}" type="number" min="0" value="${v}"/></td>`;
    }
    h += `</tr>`;
  }
  h += `</tbody></table>`;
  $(containerId).innerHTML = h;
}

function bBuildAvail() {
  const cl = bResLabels();
  let h = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">`;
  for (let j = 0; j < B.numRes; j++) {
    const v = B.availVec[j] !== undefined ? B.availVec[j] : 3;
    h += `<div style="text-align:center;">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text2);margin-bottom:4px;">${cl[j]}</div>
      <input class="cell-input" id="b-avail-${j}" type="number" min="0" value="${v}" style="width:54px;"/>
    </div>`;
  }
  h += `</div>`;
  $('b-avail-inputs').innerHTML = h;
}

function bReadMatrices() {
  B.allocMat = Array.from({ length: B.numProc }, (_, i) =>
    Array.from({ length: B.numRes }, (_, j) => parseInt($(`b-alloc-${i}-${j}`)?.value || 0) || 0));
  B.maxMat = Array.from({ length: B.numProc }, (_, i) =>
    Array.from({ length: B.numRes }, (_, j) => parseInt($(`b-max-${i}-${j}`)?.value || 0) || 0));
  B.availVec = Array.from({ length: B.numRes }, (_, j) => parseInt($(`b-avail-${j}`)?.value || 0) || 0);
}

function bRebuild() {
  $('b-proc-count').textContent = B.numProc;
  $('b-res-count').textContent = B.numRes;
  bBuildTable('b-alloc-inputs', 'b-alloc', B.allocMat);
  bBuildTable('b-max-inputs', 'b-max', B.maxMat);
  bBuildAvail();
  bRefresh();
}

/* ── Compute need ── */
function bComputeNeed() {
  return B.allocMat.map((row, i) =>
    row.map((v, j) => Math.max(0, (B.maxMat[i]?.[j] || 0) - v)));
}

/* ── Safety algorithm ── */
function bRunSafety() {
  const need = bComputeNeed();
  const work = [...B.availVec];
  const finish = Array(B.numProc).fill(false);
  const seq = [], steps = [];
  let changed = true;

  while (changed && seq.length < B.numProc) {
    changed = false;
    for (let i = 0; i < B.numProc; i++) {
      if (finish[i]) continue;
      const canRun = need[i].every((n, j) => n <= work[j]);
      steps.push({ type: canRun ? 'ok' : 'fail', proc: i, work: [...work], need: need[i] });
      if (canRun) {
        for (let j = 0; j < B.numRes; j++) work[j] += B.allocMat[i][j];
        finish[i] = true; seq.push(i); changed = true;
        steps.push({ type: 'complete', proc: i, work: [...work] });
      }
    }
  }
  const safe = seq.length === B.numProc;
  steps.push({ type: safe ? 'safe' : 'unsafe', seq: [...seq], work: [...work] });
  return { safe, seq, steps, need };
}

/* ── Display matrices ── */
function bRenderNeed(rowState = []) {
  const need = bComputeNeed();
  const cl = bResLabels(), rl = bProcLabels();
  let h = `<table class="display-table"><thead><tr><th></th>`;
  cl.forEach(l => h += `<th>${l}</th>`);
  h += `</tr></thead><tbody>`;
  for (let i = 0; i < B.numProc; i++) {
    h += `<tr><td class="proc-label">${rl[i]}</td>`;
    for (let j = 0; j < B.numRes; j++)
      h += `<td><div class="d-cell ${rowState[i] || ''}">${need[i]?.[j] || 0}</div></td>`;
    h += `</tr>`;
  }
  h += `</tbody></table>`;
  $('b-need-matrix').innerHTML = h;
}

function bRenderAlloc(rowState = []) {
  const cl = bResLabels(), rl = bProcLabels();
  let h = `<table class="display-table"><thead><tr><th></th>`;
  cl.forEach(l => h += `<th>${l}</th>`);
  h += `</tr></thead><tbody>`;
  for (let i = 0; i < B.numProc; i++) {
    h += `<tr><td class="proc-label">${rl[i]}</td>`;
    for (let j = 0; j < B.numRes; j++)
      h += `<td><div class="d-cell ${rowState[i] || ''}">${B.allocMat[i]?.[j] || 0}</div></td>`;
    h += `</tr>`;
  }
  h += `</tbody></table>`;
  $('b-alloc-display').innerHTML = h;
}

function bRenderWork(work) {
  const cl = bResLabels();
  $('b-work-chips').innerHTML = cl.map((l, j) => `
    <div class="avail-chip">
      <div class="avail-chip-val">${work[j] ?? 0}</div>
      <div class="avail-chip-label">${l}</div>
    </div>`).join('');
}

/* ── Process cards ── */
function bRenderCards(states = []) {
  const wrap = $('b-proc-cards'); wrap.innerHTML = '';
  const need = bComputeNeed();
  for (let i = 0; i < B.numProc; i++) {
    const st = states[i] || 'idle';
    const cardCls = { idle: '', active: 'pc-active', safe: 'pc-safe', unsafe: 'pc-unsafe', run: 'pc-run' }[st] || '';
    const chipCls = { idle: 'chip-idle', active: 'chip-active', safe: 'chip-safe', unsafe: 'chip-unsafe', run: 'chip-run' }[st] || 'chip-idle';
    const chipTxt = { idle: 'IDLE', active: 'CHECKING', safe: 'DONE', unsafe: 'BLOCKED', run: 'RUNNING' }[st] || 'IDLE';
    const alloc = (B.allocMat[i] || []).join(', ') || '—';
    const needV = (need[i] || []).join(', ') || '—';
    const pct = st === 'safe' ? 100 : (st === 'run' ? 60 : 0);
    const barColor = st === 'safe' ? 'var(--green)' : st === 'run' ? 'var(--yellow)' : 'var(--accent)';
    wrap.innerHTML += `
      <div class="process-card ${cardCls}" id="bpc-${i}">
        <div class="process-card-header">
          <span class="process-id">P${i}</span>
          <span class="chip ${chipCls}" id="bpch-${i}">${chipTxt}</span>
        </div>
        <div class="process-card-sub">PROCESS</div>
        <div class="process-details">ALLOC: [${alloc}]<br>NEED: [${needV}]</div>
        <div class="process-progress-wrap">
          <div class="process-progress-bar" style="width:${pct}%;background:${barColor};"></div>
        </div>
      </div>`;
  }
}

/* ── Banner ── */
function bShowBanner(type, seq = []) {
  const b = $('b-banner');
  b.className = 'result-banner show ' + type;
  $('b-banner-icon').textContent = type === 'safe' ? '✓' : '✗';
  $('b-banner-title').textContent = type === 'safe' ? 'SAFE STATE' : 'UNSAFE STATE — POTENTIAL DEADLOCK';
  $('b-banner-detail').textContent = type === 'safe'
    ? `Safe sequence: < ${seq.map(i => 'P' + i).join(' → ')} >`
    : 'No safe sequence exists. Deadlock may occur.';
}
function bHideBanner() { $('b-banner').className = 'result-banner'; }

function bRefresh() {
  $('b-stat-procs').textContent = B.numProc;
  B.procStates = Array(B.numProc).fill('idle');
  bRenderCards(B.procStates);
  bRenderNeed(); bRenderAlloc();
  bRenderWork(B.availVec.length ? B.availVec : Array(B.numRes).fill(0));
}

/* ── INSTANT RUN ── */
$('b-runBtn').onclick = () => {
  bReadMatrices(); bRefresh();
  const { safe, seq, steps } = bRunSafety();

  const states = Array(B.numProc).fill('idle');
  seq.forEach(i => states[i] = 'safe');
  if (!safe) for (let i = 0; i < B.numProc; i++) if (states[i] === 'idle') states[i] = 'unsafe';
  bRenderCards(states);

  const rowState = Array(B.numProc).fill('');
  seq.forEach(i => rowState[i] = 'safe-row');
  if (!safe) for (let i = 0; i < B.numProc; i++) if (!rowState[i]) rowState[i] = 'unsafe-row';
  bRenderNeed(rowState); bRenderAlloc(rowState);
  bRenderWork(B.availVec);

  // Safe sequence display
  const ss = $('b-safe-seq');
  if (seq.length > 0) {
    ss.innerHTML = seq.map((p, idx) =>
      `${idx > 0 ? '<span class="seq-arrow">→</span>' : ''}<span class="seq-item">P${p}</span>`
    ).join('');
  } else {
    ss.innerHTML = '<span class="queue-empty" style="color:var(--red)">NO SAFE SEQUENCE</span>';
  }

  // Step log
  const sl = $('b-step-log'); sl.innerHTML = '';
  steps.forEach((s, idx) => {
    const d = document.createElement('div');
    d.className = 'step-log-row';
    if (s.type === 'ok') d.innerHTML = `<span style="color:var(--accent)">${idx + 1}</span> <span style="color:var(--green)">P${s.proc}</span>: Need[${s.need.join(',')}] ≤ Work[${s.work.join(',')}] ✓`;
    else if (s.type === 'fail') d.innerHTML = `<span style="color:var(--accent)">${idx + 1}</span> <span style="color:var(--text2)">P${s.proc}</span>: Need[${s.need.join(',')}] > Work[${s.work.join(',')}] ✗`;
    else if (s.type === 'complete') d.innerHTML = `<span style="color:var(--accent)">${idx + 1}</span> <span style="color:var(--green)">P${s.proc} executes →</span> Work=[${s.work.join(',')}]`;
    else if (s.type === 'safe') d.innerHTML = `<span style="color:var(--green)">✓ SAFE. Sequence: ${s.seq.map(i => 'P' + i).join('→')}</span>`;
    else if (s.type === 'unsafe') d.innerHTML = `<span style="color:var(--red)">✗ UNSAFE STATE DETECTED</span>`;
    sl.appendChild(d);
  });
  sl.scrollTop = sl.scrollHeight;

  bShowBanner(safe ? 'safe' : 'unsafe', seq);
  $('b-stat-done').textContent = seq.length;
  $('b-work-status').textContent = safe ? 'SAFE' : 'UNSAFE';
  $('b-work-status').style.color = safe ? 'var(--green)' : 'var(--red)';

  log('b-terminal', safe ? `Safe sequence: ${seq.map(i => 'P' + i).join(' → ')}` : 'No safe sequence — potential deadlock.', safe ? 'log-success' : 'log-error');
};

/* ── ANIMATED SAFETY CHECK ── */
$('b-animBtn').onclick = () => {
  if (B.animTimer) {
    clearInterval(B.animTimer); B.animTimer = null;
    $('b-animBtn').textContent = '▶ ANIMATE SAFETY CHECK'; return;
  }
  bReadMatrices(); bHideBanner();
  B.procStates = Array(B.numProc).fill('idle');
  bRenderCards(B.procStates); bRenderNeed(); bRenderAlloc();

  const { safe, seq, steps } = bRunSafety();
  B.animSteps = steps; B.animIdx = 0; B.safeSeq = [];
  $('b-safe-seq').innerHTML = '<span class="queue-empty">—</span>';
  $('b-step-log').innerHTML = '';
  $('b-stat-done').textContent = 0;
  $('b-animBtn').textContent = '⏸ PAUSE';
  bRenderWork(B.availVec);

  B.animTimer = setInterval(() => {
    if (B.animIdx >= B.animSteps.length) {
      clearInterval(B.animTimer); B.animTimer = null;
      $('b-animBtn').textContent = '▶ ANIMATE SAFETY CHECK';
      bShowBanner(safe ? 'safe' : 'unsafe', seq);
      log('b-terminal', safe ? 'Animation complete — SAFE STATE.' : 'Animation complete — UNSAFE STATE.', safe ? 'log-success' : 'log-error');
      return;
    }

    const s = B.animSteps[B.animIdx++];
    $('b-stat-step').textContent = B.animIdx;

    const rowState = Array(B.numProc).fill('');
    B.safeSeq.forEach(i => rowState[i] = 'safe-row');

    if (s.type === 'ok') {
      B.procStates[s.proc] = 'run';
      rowState[s.proc] = 'run-row';
      bRenderCards(B.procStates); bRenderNeed(rowState); bRenderAlloc(rowState); bRenderWork(s.work);
      log('b-terminal', `P${s.proc}: Need[${s.need.join(',')}] ≤ Work[${s.work.join(',')}] — eligible`, 'log-info');

    } else if (s.type === 'fail') {
      B.procStates[s.proc] = 'active';
      rowState[s.proc] = 'active-row';
      bRenderCards(B.procStates); bRenderNeed(rowState); bRenderAlloc(rowState);
      log('b-terminal', `P${s.proc}: Need[${s.need.join(',')}] > Work[${s.work.join(',')}] — blocked`, 'log-warn');

    } else if (s.type === 'complete') {
      B.procStates[s.proc] = 'safe';
      B.safeSeq.push(s.proc);
      $('b-stat-done').textContent = B.safeSeq.length;
      rowState[s.proc] = 'safe-row';
      bRenderCards(B.procStates); bRenderNeed(rowState); bRenderAlloc(rowState); bRenderWork(s.work);
      const ss = $('b-safe-seq');
      if (ss.querySelector('.queue-empty')) ss.innerHTML = '';
      const span = document.createElement('span');
      span.innerHTML = (B.safeSeq.length > 1 ? '<span class="seq-arrow">→</span>' : '') + `<span class="seq-item">P${s.proc}</span>`;
      ss.appendChild(span);
      log('b-terminal', `P${s.proc} done → Work=[${s.work.join(',')}]`, 'log-success');

    } else if (s.type === 'unsafe') {
      for (let i = 0; i < B.numProc; i++) {
        if (B.procStates[i] === 'idle' || B.procStates[i] === 'active') {
          B.procStates[i] = 'unsafe'; rowState[i] = 'unsafe-row';
        }
      }
      bRenderCards(B.procStates); bRenderNeed(rowState); bRenderAlloc(rowState);
      $('b-safe-seq').innerHTML = '<span class="queue-empty" style="color:var(--red)">NO SAFE SEQUENCE</span>';
    }

    $('b-work-status').textContent = (s.type === 'safe' || s.type === 'unsafe')
      ? (s.type === 'safe' ? 'SAFE' : 'UNSAFE') : 'CHECKING';
    $('b-work-status').style.color = s.type === 'safe' ? 'var(--green)' : s.type === 'unsafe' ? 'var(--red)' : '';

    // Step log entry
    const sl = $('b-step-log');
    const d = document.createElement('div');
    d.className = 'step-log-row';
    if (s.type === 'ok') d.innerHTML = `<span style="color:var(--accent)">${B.animIdx}</span> P${s.proc}: <span style="color:var(--green)">ELIGIBLE</span>`;
    else if (s.type === 'fail') d.innerHTML = `<span style="color:var(--accent)">${B.animIdx}</span> P${s.proc}: <span style="color:var(--text2)">BLOCKED</span>`;
    else if (s.type === 'complete') d.innerHTML = `<span style="color:var(--accent)">${B.animIdx}</span> <span style="color:var(--green)">P${s.proc} DONE → Work=[${s.work.join(',')}]</span>`;
    else if (s.type === 'safe') d.innerHTML = `<span style="color:var(--green)">✓ SAFE STATE CONFIRMED</span>`;
    else if (s.type === 'unsafe') d.innerHTML = `<span style="color:var(--red)">✗ UNSAFE</span>`;
    sl.appendChild(d); sl.scrollTop = sl.scrollHeight;
  }, B.animSpeed);
};

/* ── COUNT CONTROLS ── */
$('b-proc-dec').onclick = () => { if (B.numProc > 1) { B.numProc--; bRebuild(); } };
$('b-proc-inc').onclick = () => { if (B.numProc < 8) { B.numProc++; bRebuild(); } };
$('b-res-dec').onclick = () => { if (B.numRes > 1) { B.numRes--; bRebuild(); } };
$('b-res-inc').onclick = () => { if (B.numRes < 6) { B.numRes++; bRebuild(); } };

/* ── PRESETS ── */
$('b-preset-classic').onclick = () => {
  B.numProc = 5; B.numRes = 3;
  B.allocMat = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]];
  B.maxMat = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
  B.availVec = [3, 3, 2];
  bRebuild();
  setTimeout(() => {
    B.allocMat.forEach((r, i) => r.forEach((v, j) => { const e = $(`b-alloc-${i}-${j}`); if (e) e.value = v; }));
    B.maxMat.forEach((r, i) => r.forEach((v, j) => { const e = $(`b-max-${i}-${j}`); if (e) e.value = v; }));
    B.availVec.forEach((v, j) => { const e = $(`b-avail-${j}`); if (e) e.value = v; });
    bRefresh();
    log('b-terminal', 'Loaded classic example (safe: P1→P3→P4→P0→P2).', 'log-info');
  }, 50);
};
$('b-preset-unsafe').onclick = () => {
  B.numProc = 3; B.numRes = 2;
  B.allocMat = [[1, 0], [0, 1], [1, 1]];
  B.maxMat = [[2, 2], [2, 2], [2, 2]];
  B.availVec = [0, 0];
  bRebuild();
  setTimeout(() => {
    B.allocMat.forEach((r, i) => r.forEach((v, j) => { const e = $(`b-alloc-${i}-${j}`); if (e) e.value = v; }));
    B.maxMat.forEach((r, i) => r.forEach((v, j) => { const e = $(`b-max-${i}-${j}`); if (e) e.value = v; }));
    B.availVec.forEach((v, j) => { const e = $(`b-avail-${j}`); if (e) e.value = v; });
    bRefresh();
    log('b-terminal', 'Loaded unsafe scenario — no safe sequence.', 'log-warn');
  }, 50);
};
$('b-preset-clear').onclick = () => {
  B.allocMat = []; B.maxMat = []; B.availVec = [];
  bRebuild(); bHideBanner();
  log('b-terminal', 'Matrices cleared to zero.', 'log-muted');
};

/* ── SPEED ── */
document.querySelectorAll('#b-speed-btns .speed-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#b-speed-btns .speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    B.animSpeed = parseInt(btn.dataset.speed);
  };
});

$('b-resetBtn').onclick = () => {
  if (B.animTimer) { clearInterval(B.animTimer); B.animTimer = null; }
  $('b-animBtn').textContent = '▶ ANIMATE SAFETY CHECK';
  bHideBanner(); B.procStates = Array(B.numProc).fill('idle');
  bRenderCards(B.procStates); bRenderNeed(); bRenderAlloc();
  bRenderWork(B.availVec.length ? B.availVec : Array(B.numRes).fill(0));
  $('b-safe-seq').innerHTML = '<span class="queue-empty">—</span>';
  $('b-step-log').innerHTML = '<div class="step-log-row log-muted">— Awaiting safety check…</div>';
  $('b-stat-done').textContent = 0; $('b-stat-step').textContent = '—';
  $('b-work-status').textContent = 'IDLE'; $('b-work-status').style.color = '';
  log('b-terminal', 'System reset.', 'log-muted');
};
$('b-clearBtn').onclick = () => {
  $('b-terminal').innerHTML = '<div class="log-muted">&gt; terminal cleared.</div>';
};

/* ─── INIT ────────────────────────────────────────────────── */
(function init() {
  // RAG: load deadlock preset by default
  R.numProc = 3; R.numRes = 2;
  R.reqEdges = [{ p: 0, r: 0 }, { p: 1, r: 1 }, { p: 2, r: 0 }];
  R.allocEdges = [{ r: 0, p: 1 }, { r: 1, p: 2 }];
  ragRenderTags(); ragRefresh();
  log('r-terminal', 'RAG detector initialized with deadlock preset.', 'log-info');

  // Banker: load classic preset by default
  B.numProc = 4; B.numRes = 3;
  B.allocMat = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1]];
  B.maxMat = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2]];
  B.availVec = [3, 3, 2];
  bRebuild();
  setTimeout(() => {
    B.allocMat.forEach((r, i) => r.forEach((v, j) => { const e = $(`b-alloc-${i}-${j}`); if (e) e.value = v; }));
    B.maxMat.forEach((r, i) => r.forEach((v, j) => { const e = $(`b-max-${i}-${j}`); if (e) e.value = v; }));
    B.availVec.forEach((v, j) => { const e = $(`b-avail-${j}`); if (e) e.value = v; });
    bRefresh();
    log('b-terminal', "Banker's algorithm initialized with classic example.", 'log-info');
  }, 80);
})();
