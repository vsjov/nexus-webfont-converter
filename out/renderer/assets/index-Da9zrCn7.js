const setupDropZone = (el, onPaths) => {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", (e) => {
    e.stopPropagation();
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove("drag-over");
    }
  });
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    const paths = files.map((f) => window.api.getPathForFile(f));
    onPaths(paths);
  });
};
const renderFileList = (el, items, onRemove) => {
  el.innerHTML = items.map((item, i) => `
    <li class="file-item">
      <span class="file-item__name">${escapeHtml(item.label)}</span>
      <span class="file-item__count">${item.fileCount} file${item.fileCount !== 1 ? "s" : ""}</span>
      <button
        class="file-item__remove"
        data-index="${i}"
        aria-label="Remove ${escapeHtml(item.label)}"
        type="button"
      >×</button>
    </li>
  `).join("");
  el.querySelectorAll(".file-item__remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset["index"]);
      onRemove(index);
    });
  });
};
const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const setConvertButtonState = (btn, enabled) => {
  btn.disabled = !enabled;
};
const updateProgress = (section, current, total, step) => {
  const fill = section.querySelector(".progress-bar__fill");
  const count = section.querySelector(".progress-bar__count");
  const stepEl = section.querySelector("#progress-step");
  const bar = section.querySelector(".progress-bar");
  const pct = total > 0 ? Math.round(current / total * 100) : 0;
  if (fill) fill.style.width = `${pct}%`;
  if (count) count.textContent = `${current} / ${total}`;
  if (stepEl) stepEl.textContent = step;
  if (bar) bar.setAttribute("aria-valuenow", String(pct));
};
const resetProgress = (section) => {
  updateProgress(section, 0, 0, "");
};
const dropZoneEl = document.getElementById("drop-zone");
const fileListEl = document.getElementById("file-list");
const convertBtnEl = document.getElementById("convert-btn");
const progressSection = document.getElementById("progress-section");
let stagedItems = [];
let isConverting = false;
const refresh = () => {
  renderFileList(fileListEl, stagedItems, handleRemove);
  setConvertButtonState(convertBtnEl, stagedItems.length > 0 && !isConverting);
};
const handlePaths = async (paths) => {
  if (isConverting) return;
  const items = await window.api.scanPaths(paths);
  for (const item of items) {
    const alreadyStaged = stagedItems.some((s) => s.inputDir === item.inputDir);
    if (!alreadyStaged) stagedItems.push(item);
  }
  refresh();
};
const handleRemove = (index) => {
  stagedItems.splice(index, 1);
  refresh();
};
const handleConvert = () => {
  if (stagedItems.length === 0 || isConverting) return;
  isConverting = true;
  refresh();
  progressSection.hidden = false;
  window.api.startConversion(stagedItems);
};
setupDropZone(dropZoneEl, (paths) => void handlePaths(paths));
convertBtnEl.addEventListener("click", handleConvert);
window.api.onProgress((event) => {
  updateProgress(progressSection, event.current, event.total, event.step);
});
window.api.onComplete(() => {
  isConverting = false;
  stagedItems = [];
  refresh();
  setTimeout(() => {
    progressSection.hidden = true;
    resetProgress(progressSection);
  }, 1500);
});
window.api.onError((message) => {
  isConverting = false;
  refresh();
  progressSection.hidden = true;
  resetProgress(progressSection);
  alert(`Conversion failed: ${message}`);
});
