const DEFAULT_REFERENCES = "7, 0, 1, 2, 0, 3, 0, 4";

const state = {
  algorithms: [],
  result: null,
  currentStep: 0,
  timer: null,
};

const elements = {
  form: document.querySelector("#sim-form"),
  algorithmStrip: document.querySelector("#algorithm-strip"),
  algorithm: document.querySelector("#algorithm"),
  frameCount: document.querySelector("#frame-count"),
  referenceString: document.querySelector("#reference-string"),
  resetDemo: document.querySelector("#reset-demo"),
  statsGrid: document.querySelector("#stats-grid"),
  runLabel: document.querySelector("#run-label"),
  stepTitle: document.querySelector("#step-title"),
  stepBadge: document.querySelector("#step-badge"),
  summaryBand: document.querySelector("#summary-band"),
  currentPage: document.querySelector("#current-page"),
  frameStack: document.querySelector("#frame-stack"),
  stepNotes: document.querySelector("#step-notes"),
  prevStep: document.querySelector("#prev-step"),
  playPause: document.querySelector("#play-pause"),
  nextStep: document.querySelector("#next-step"),
  stepRange: document.querySelector("#step-range"),
  timeline: document.querySelector("#timeline"),
};

async function init() {
  bindEvents();
  await loadAlgorithms();
  await runSimulation();
}

function bindEvents() {
  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runSimulation();
  });

  elements.resetDemo.addEventListener("click", async () => {
    elements.algorithm.value = "LRU";
    elements.frameCount.value = "3";
    elements.referenceString.value = DEFAULT_REFERENCES;
    await runSimulation();
  });

  elements.prevStep.addEventListener("click", () => setCurrentStep(state.currentStep - 1));
  elements.nextStep.addEventListener("click", () => setCurrentStep(state.currentStep + 1));
  elements.playPause.addEventListener("click", togglePlayback);
  elements.stepRange.addEventListener("input", () => setCurrentStep(Number(elements.stepRange.value)));
}

async function loadAlgorithms() {
  const response = await fetch("/algorithms");
  const payload = await response.json();
  state.algorithms = payload.algorithms;
  elements.algorithm.innerHTML = state.algorithms
    .map((algorithm) => `<option value="${algorithm}">${formatAlgorithm(algorithm)}</option>`)
    .join("");
  elements.algorithmStrip.innerHTML = state.algorithms
    .map((algorithm) => `<button class="algorithm-pill" type="button" data-algorithm="${algorithm}">${formatAlgorithm(algorithm)}</button>`)
    .join("");
  elements.algorithmStrip.querySelectorAll(".algorithm-pill").forEach((button) => {
    button.addEventListener("click", async () => {
      elements.algorithm.value = button.dataset.algorithm;
      await runSimulation();
    });
  });
  elements.algorithm.value = "LRU";
}

async function runSimulation() {
  stopPlayback();
  clearError();

  const request = {
    algorithm: elements.algorithm.value,
    frame_count: Number(elements.frameCount.value),
    reference_string: parseReferences(elements.referenceString.value),
  };

  try {
    const response = await fetch("/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Simulation failed.");
    }
    state.result = payload;
    state.currentStep = 0;
    renderAll();
  } catch (error) {
    renderError(error.message);
  }
}

function parseReferences(value) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const numberValue = Number(item);
      return Number.isNaN(numberValue) ? item : numberValue;
    });
}

function renderAll() {
  renderAlgorithmStrip();
  renderStats();
  renderSummaryBand();
  renderTimeline();
  renderStep();
}

function renderAlgorithmStrip() {
  elements.algorithmStrip.querySelectorAll(".algorithm-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.algorithm === elements.algorithm.value);
  });
}

function renderStats() {
  const { stats } = state.result;
  const statsItems = [
    ["References", stats.references],
    ["Hits", stats.hits],
    ["Faults", stats.faults],
    ["Hit rate", `${Math.round(stats.hit_rate * 100)}%`],
    ["Fault rate", `${Math.round(stats.fault_rate * 100)}%`],
  ];

  elements.statsGrid.innerHTML = statsItems
    .map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderSummaryBand() {
  const { stats } = state.result;
  const hitPercent = Math.round(stats.hit_rate * 100);
  const faultPercent = Math.round(stats.fault_rate * 100);

  elements.summaryBand.innerHTML = `
    <div class="meter-block">
      <div class="meter-label">
        <span>Hit ratio</span>
        <strong>${hitPercent}%</strong>
      </div>
      <div class="meter-track"><span style="width: ${hitPercent}%"></span></div>
    </div>
    <div class="meter-block fault-meter">
      <div class="meter-label">
        <span>Fault ratio</span>
        <strong>${faultPercent}%</strong>
      </div>
      <div class="meter-track"><span style="width: ${faultPercent}%"></span></div>
    </div>
  `;
}

function renderTimeline() {
  elements.timeline.innerHTML = state.result.steps
    .map((step, index) => {
      const frames = step.frames
        .map((frame) => {
          const classes = ["mini-frame"];
          if (frame === null) classes.push("empty");
          if (step.hit && frame === step.page) classes.push("hit");
          if (step.evicted !== null && frame === step.page) classes.push("evicted");
          return `<div class="${classes.join(" ")}">${frame ?? "empty"}</div>`;
        })
        .join("");
      return `
        <button class="timeline-step" type="button" data-step="${index}">
          <div class="timeline-head">
            <span>#${index + 1}</span>
            <span class="${step.hit ? "mini-hit" : "mini-fault"}">${step.hit ? "Hit" : "Fault"}</span>
          </div>
          <div class="timeline-page">Page ${step.page}</div>
          <div class="mini-frames">${frames}</div>
        </button>
      `;
    })
    .join("");

  elements.timeline.querySelectorAll(".timeline-step").forEach((button) => {
    button.addEventListener("click", () => setCurrentStep(Number(button.dataset.step)));
  });

  elements.stepRange.max = Math.max(state.result.steps.length - 1, 0);
}

function renderStep() {
  const step = state.result.steps[state.currentStep];
  const total = state.result.steps.length;

  elements.runLabel.textContent = `${formatAlgorithm(state.result.algorithm)} · ${state.result.frame_count} frames`;
  elements.stepTitle.textContent = `Step ${state.currentStep + 1} of ${total}`;
  elements.stepBadge.textContent = step.hit ? "Hit" : "Fault";
  elements.stepBadge.className = `step-badge ${step.hit ? "hit" : "fault"}`;
  elements.currentPage.textContent = step.page;
  elements.stepRange.value = state.currentStep;
  elements.prevStep.disabled = state.currentStep === 0;
  elements.nextStep.disabled = state.currentStep === total - 1;

  elements.frameStack.innerHTML = step.frames
    .map((frame, index) => {
      const empty = frame === null;
      const isRequestedPage = !empty && frame === step.page;
      const chips = [];
      if (step.pointer === index) chips.push(`<span class="chip">pointer</span>`);
      if (step.reference_bits) chips.push(`<span class="chip bit">bit ${step.reference_bits[index]}</span>`);
      if (step.evicted !== null && frame === step.page) chips.push(`<span class="chip evict">replaced ${step.evicted}</span>`);

      return `
        <div class="frame-slot ${isRequestedPage ? "requested" : ""}">
          <span class="frame-index">Frame ${index + 1}</span>
          <span class="frame-value ${empty ? "empty" : ""}">${empty ? "empty" : frame}</span>
          <span class="frame-meta">${chips.join("")}</span>
        </div>
      `;
    })
    .join("");

  const notes = [
    step.hit
      ? `<strong>${step.page}</strong> was already in memory.`
      : `<strong>${step.page}</strong> caused a page fault.`,
  ];
  if (step.evicted !== null) notes.push(`<strong>${step.evicted}</strong> was evicted.`);
  if (state.result.algorithm === "RANDOM" && step.evicted !== null) notes.push(`Random selected the victim frame for this fault.`);
  if (state.result.algorithm === "OPTIMAL" && step.evicted !== null) notes.push(`Optimal evicted the page whose next use is farthest away.`);
  if (step.pointer !== null) notes.push(`Second chance pointer is now at frame <strong>${step.pointer + 1}</strong>.`);

  elements.stepNotes.innerHTML = notes.map((note) => `<div class="note">${note}</div>`).join("");

  elements.timeline.querySelectorAll(".timeline-step").forEach((button, index) => {
    button.classList.toggle("active", index === state.currentStep);
  });
}

function setCurrentStep(nextStep) {
  if (!state.result) return;
  const maxStep = state.result.steps.length - 1;
  state.currentStep = Math.min(Math.max(nextStep, 0), maxStep);
  renderStep();
  if (state.currentStep === maxStep) stopPlayback();
}

function togglePlayback() {
  if (state.timer) {
    stopPlayback();
    return;
  }

  if (state.currentStep >= state.result.steps.length - 1) {
    setCurrentStep(0);
  }

  elements.playPause.textContent = "Ⅱ";
  elements.playPause.setAttribute("aria-label", "Pause simulation");
  state.timer = window.setInterval(() => {
    setCurrentStep(state.currentStep + 1);
  }, 850);
}

function stopPlayback() {
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  elements.playPause.textContent = "▶";
  elements.playPause.setAttribute("aria-label", "Play simulation");
}

function renderError(message) {
  stopPlayback();
  elements.stepTitle.textContent = "Simulation error";
  elements.stepBadge.textContent = "Error";
  elements.stepBadge.className = "step-badge fault";
  elements.stepNotes.innerHTML = `<div class="note error">${message}</div>`;
}

function clearError() {
  elements.stepNotes.querySelector(".error")?.remove();
}

function formatAlgorithm(value) {
  const abbreviations = new Set(["FIFO", "LRU", "MRU", "LFU", "MFU"]);
  if (abbreviations.has(value)) return value;
  if (value === "SECOND_CHANCE") return "Second Chance";
  if (value === "OPTIMAL") return "Optimal";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

init();
