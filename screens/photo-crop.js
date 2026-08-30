// Levain — crop step between picking a photo and saving it. Shows the
// full image in a box matching the target photoSlot's own aspect ratio,
// lets the user drag to reposition and pinch/scroll/slider to zoom, then
// rasterizes the visible region to a JPEG data URI at `maxDim` on its long
// edge. Kept out of shared-ui.js (which is small DOM/icon helpers) since
// this is a self-contained interaction with its own pointer-event state.
import { el } from "./shared-ui.js";

const SHEET_MAX_W = 460;
const ZOOM_MAX_MULT = 4; // user can zoom up to 4x past the "fill the box" scale

export function cropImage({ file, aspectRatio = 1, maxDim = 900, quality = 0.65 }) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("could not load image"));
    };
    img.onload = () => openCropSheet({ img, objectUrl, aspectRatio, maxDim, quality, resolve, reject });
    img.src = objectUrl;
  });
}

function openCropSheet({ img, objectUrl, aspectRatio, maxDim, quality, resolve, reject }) {
  const overlay = el("div", {
    style: "position:fixed;inset:0;background:rgba(24,20,13,.7);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box",
  });

  const sheet = el("div", {
    style: `width:100%;max-width:${SHEET_MAX_W}px;background:#FBF8F1;border-radius:20px;padding:20px;box-sizing:border-box;box-shadow:0 20px 50px rgba(24,20,13,.35)`,
  });

  const head = el("div", { style: "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px" });
  head.appendChild(el("div", { style: "font:400 19px/1 'Source Serif 4',Georgia,serif;color:#221F19", text: "Adjust photo" }));
  const cancelLink = el("div", { style: "font:500 13px/1 var(--ui);color:#8A8171;cursor:pointer", text: "Cancel" });
  head.appendChild(cancelLink);
  sheet.appendChild(head);

  const frameW = SHEET_MAX_W - 40;
  let cropW = frameW;
  let cropH = frameW / aspectRatio;
  const maxCropH = window.innerHeight - 260;
  if (cropH > maxCropH) { cropH = maxCropH; cropW = cropH * aspectRatio; }

  const viewport = el("div", {
    style: `position:relative;width:${cropW}px;max-width:100%;height:${cropH}px;overflow:hidden;border-radius:14px;background:#111;touch-action:none;cursor:grab;margin:0 auto`,
  });
  const imgEl = el("img", { src: objectUrl, alt: "", style: "position:absolute;left:0;top:0;transform-origin:0 0;user-select:none;pointer-events:none" });
  viewport.appendChild(imgEl);
  sheet.appendChild(viewport);

  const minScale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
  let scale = minScale;
  let tx = (cropW - img.naturalWidth * scale) / 2;
  let ty = (cropH - img.naturalHeight * scale) / 2;

  function clampPos() {
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    tx = Math.min(0, Math.max(cropW - w, tx));
    ty = Math.min(0, Math.max(cropH - h, ty));
  }
  function apply() {
    clampPos();
    imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }
  function clampScale(s) {
    return Math.min(Math.max(s, minScale), minScale * ZOOM_MAX_MULT);
  }
  apply();

  const slider = el("input", {
    type: "range", min: "0", max: "100", value: "0",
    style: "width:100%;margin-top:16px;accent-color:#A65A2E",
  });
  function syncSliderFromScale() {
    const t = (scale - minScale) / (minScale * (ZOOM_MAX_MULT - 1));
    slider.value = String(Math.round(Math.min(Math.max(t, 0), 1) * 100));
  }
  slider.addEventListener("input", () => {
    const t = Number(slider.value) / 100;
    scale = minScale + t * minScale * (ZOOM_MAX_MULT - 1);
    apply();
  });
  sheet.appendChild(slider);

  // Drag to reposition; two fingers pinch to zoom. Pointer Events cover
  // mouse + touch + pen with one code path.
  const pointers = new Map();
  let dragStart = null;
  let pinchStart = null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  viewport.addEventListener("pointerdown", (e) => {
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, tx, ty };
    } else if (pointers.size === 2) {
      pinchStart = { dist: dist(...pointers.values()), scale };
    }
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1 && dragStart) {
      tx = dragStart.tx + (e.clientX - dragStart.x);
      ty = dragStart.ty + (e.clientY - dragStart.y);
      apply();
    } else if (pointers.size === 2 && pinchStart) {
      scale = clampScale(pinchStart.scale * (dist(...pointers.values()) / pinchStart.dist));
      apply();
      syncSliderFromScale();
    }
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size < 1) dragStart = null;
  }
  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    scale = clampScale(scale * (e.deltaY < 0 ? 1.08 : 0.92));
    apply();
    syncSliderFromScale();
  }, { passive: false });

  const btnRow = el("div", { style: "display:flex;margin-top:18px" });
  const doneBtn = el("div", { class: "btn-primary", style: "flex:1;user-select:none", text: "Use photo" });
  btnRow.appendChild(doneBtn);
  sheet.appendChild(btnRow);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  function cleanup() {
    document.removeEventListener("keydown", onKey);
    document.body.removeChild(overlay);
    URL.revokeObjectURL(objectUrl);
  }
  function onKey(e) { if (e.key === "Escape") { cleanup(); reject(new Error("cancelled")); } }
  document.addEventListener("keydown", onKey);
  cancelLink.addEventListener("click", () => { cleanup(); reject(new Error("cancelled")); });

  doneBtn.addEventListener("click", () => {
    const outW = aspectRatio >= 1 ? maxDim : Math.round(maxDim * aspectRatio);
    const outH = aspectRatio >= 1 ? Math.round(maxDim / aspectRatio) : maxDim;
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    canvas.getContext("2d").drawImage(
      img,
      -tx / scale, -ty / scale, cropW / scale, cropH / scale,
      0, 0, outW, outH,
    );
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    cleanup();
    resolve(dataUrl);
  });
}
