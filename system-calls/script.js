'use strict';

const $ = id => document.getElementById(id);

/* ── STATE ── */
let nextPid = 2;
let processes = {}; // pid -> { pid, ppid, state: RUNNING|WAITING|ZOMBIE, img: string, children: [], fds: [] }
let activePid = 1;

/* ── DOM ELEMENTS ── */
const treeContainer = $('tree-container');
const termLog = $('terminal-log');

const btnFork = $('btn-fork');
const btnExec = $('btn-exec');
const btnWait = $('btn-wait');
const btnExit = $('btn-exit');

const btnOpen = $('btn-open');
const btnRead = $('btn-read');
const btnWrite = $('btn-write');
const btnClose = $('btn-close');

const btnReset = $('btn-reset');

/* ── INITIALIZATION ── */
function initOS() {
  nextPid = 2;
  processes = {
    1: { pid: 1, ppid: 0, state: 'RUNNING', img: 'init_bash', children: [], fds: [0, 1, 2] }
  };
  activePid = 1;
  clearLog();
  logMsg('OS Booted. Init process PID=1 running.', 'log-info');
  renderTree();
}
initOS();

/* ── EVENT LISTENERS ── */
btnReset.addEventListener('click', initOS);

// Process Control
btnFork.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p) return;
  if (p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] fork() failed: Process is ${p.state}.`, 'log-error');
  
  const cPid = nextPid++;
  processes[cPid] = {
    pid: cPid,
    ppid: activePid,
    state: 'RUNNING',
    img: p.img + ' (copy)',
    children: [],
    fds: [...p.fds]
  };
  p.children.push(cPid);
  
  logMsg(`[PID ${activePid}] fork() = ${cPid}. Created child process.`, 'log-success');
  renderTree();
});

btnExec.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p) return;
  if (p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] exec() failed: Process is ${p.state}.`, 'log-error');
  
  const newImg = prompt("Enter new process image name:", "a.out");
  if (!newImg) return;
  
  p.img = newImg;
  logMsg(`[PID ${activePid}] exec("${newImg}") success. Replaced process image.`, 'log-warn');
  renderTree();
});

btnWait.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p) return;
  if (p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] wait() failed: Process is ${p.state}.`, 'log-error');
  
  if (p.children.length === 0) {
    return logMsg(`[PID ${activePid}] wait() = -1. No child processes.`, 'log-error');
  }
  
  // Check if any child is already a zombie
  let zombieChild = p.children.find(cid => processes[cid].state === 'ZOMBIE');
  
  if (zombieChild) {
    // Reap zombie immediately
    logMsg(`[PID ${activePid}] wait() = ${zombieChild}. Reaped zombie child.`, 'log-success');
    p.children = p.children.filter(cid => cid !== zombieChild);
    delete processes[zombieChild];
  } else {
    // Block parent
    p.state = 'WAITING';
    logMsg(`[PID ${activePid}] wait(). Process blocked waiting for child to terminate.`, 'log-warn');
    activePid = p.children[0]; // Switch context to first child for convenience
  }
  renderTree();
});

btnExit.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p) return;
  if (activePid === 1) return logMsg(`[PID 1] exit() failed: Cannot terminate init process! Kernel Panic!`, 'log-danger');
  
  logMsg(`[PID ${activePid}] exit(0). Process terminating...`, 'log-danger');
  
  const parent = processes[p.ppid];
  
  // Orphan children adopted by init (PID 1)
  p.children.forEach(cid => {
    processes[cid].ppid = 1;
    processes[1].children.push(cid);
    logMsg(`[PID ${cid}] Orphaned child adopted by PID 1.`, 'log-muted');
  });
  p.children = [];
  
  if (parent && parent.state === 'WAITING') {
    // Parent is waiting, reap immediately and wake parent
    parent.state = 'RUNNING';
    parent.children = parent.children.filter(cid => cid !== activePid);
    delete processes[activePid];
    logMsg(`[PID ${parent.pid}] Woke up from wait(). Reaped PID ${activePid}.`, 'log-success');
    activePid = parent.pid;
  } else {
    // Parent is running, become Zombie
    p.state = 'ZOMBIE';
    logMsg(`[PID ${activePid}] Became a ZOMBIE. Parent (PID ${p.ppid}) has not called wait().`, 'log-warn');
    activePid = 1; // fallback context
  }
  
  renderTree();
});

// File Management
btnOpen.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p || p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] open() failed.`, 'log-error');
  
  const fd = p.fds.length > 0 ? Math.max(...p.fds) + 1 : 3;
  p.fds.push(fd);
  logMsg(`[PID ${activePid}] open("file.txt", O_RDWR) = ${fd}.`, 'log-success');
});

btnRead.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p || p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] read() failed.`, 'log-error');
  if (p.fds.length <= 3) return logMsg(`[PID ${activePid}] read() error: No files open.`, 'log-error');
  
  const fd = p.fds[p.fds.length - 1];
  logMsg(`[PID ${activePid}] read(${fd}, buf, 1024) = 512 bytes read.`, 'log-muted');
});

btnWrite.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p || p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] write() failed.`, 'log-error');
  if (p.fds.length <= 3) return logMsg(`[PID ${activePid}] write() error: No files open.`, 'log-error');
  
  const fd = p.fds[p.fds.length - 1];
  logMsg(`[PID ${activePid}] write(${fd}, "hello", 5) = 5 bytes written.`, 'log-muted');
});

btnClose.addEventListener('click', () => {
  const p = processes[activePid];
  if (!p || p.state !== 'RUNNING') return logMsg(`[PID ${activePid}] close() failed.`, 'log-error');
  if (p.fds.length <= 3) return logMsg(`[PID ${activePid}] close() error: Bad file descriptor.`, 'log-error');
  
  const fd = p.fds.pop();
  logMsg(`[PID ${activePid}] close(${fd}) = 0.`, 'log-muted');
});

/* ── UTILS & RENDERING ── */
function logMsg(msg, cls = 'log-muted') {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = msg;
  termLog.appendChild(d);
  termLog.scrollTop = termLog.scrollHeight;
}

function clearLog() {
  termLog.innerHTML = '';
}

function renderTree() {
  treeContainer.innerHTML = '';
  
  function buildNode(pid) {
    const p = processes[pid];
    if (!p) return null;
    
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    
    const nodeEl = document.createElement('div');
    nodeEl.className = 'proc-node' + (activePid === pid ? ' active' : '') + (p.state === 'ZOMBIE' ? ' zombie' : '');
    nodeEl.onclick = () => {
      if (p.state !== 'ZOMBIE') {
        activePid = pid;
        renderTree();
      }
    };
    
    nodeEl.innerHTML = `
      <div class="proc-title">PID ${p.pid}</div>
      <div class="proc-sub">[${p.state}]</div>
      <div class="proc-sub" style="margin-top:4px;">${p.img}</div>
    `;
    div.appendChild(nodeEl);
    
    if (p.children.length > 0) {
      const childRow = document.createElement('div');
      childRow.className = 'tree-row';
      p.children.forEach(cid => {
        const cNode = buildNode(cid);
        if (cNode) childRow.appendChild(cNode);
      });
      div.appendChild(childRow);
    }
    
    return div;
  }
  
  const tree = buildNode(1);
  if (tree) treeContainer.appendChild(tree);
}
