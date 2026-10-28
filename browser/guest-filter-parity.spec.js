const { test } = require("@playwright/test");
const assert = require("node:assert/strict");

test("guest filter matches preview, single photo, and strip without Bridal Glow", async ({ page }) => {
 const errors = [];page.on("pageerror", error => errors.push(error.message));
 await page.route("https://**/*", route => {
  const url = route.request().url();
  if (url.startsWith("https://decemeberbooth.pages.dev/")) return route.continue();
  const body = url.includes("tasks-vision") ? "export const FilesetResolver={forVisionTasks:async()=>({})}; export const FaceLandmarker={createFromOptions:async()=>({detectForVideo:()=>({faceLandmarks:[]})})};" : url.includes("lucide") ? "window.lucide={createIcons(){}};" : url.includes("email.min") ? "window.emailjs={init(){}};" : "";
  return route.fulfill({ contentType: url.includes("fonts.googleapis") ? "text/css" : "application/javascript", body });
 });
 // Preset selection is tested without writing shared production settings.
 await page.route("**/api/themes", route => route.request().method() === "GET" ? route.continue() : route.fulfill({ contentType: "application/json", body: '{"ok":true}' }));
 await page.addInitScript(() => localStorage.setItem("photoboothEnhancementMode", "bridal-glow"));
 await page.goto(process.env.BOOTH_QA_URL || "http://127.0.0.1:4321/?testMode=booth", { waitUntil: "domcontentloaded" });
 await page.waitForFunction(() => !!window.__photoboothTest);
 await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
 await page.locator('button.theme-quick-card[data-theme-key="fall:halloween"]').click();
 assert.equal(await page.locator("#enhancementModeSelect").count(), 0);
 const results = await page.evaluate(async () => {
  const api = window.__photoboothTest;
  const select = document.querySelector("#beautyPresetSelect");
  const orientation = document.querySelector("#guestScreenOrientation");
  orientation.value = "landscape"; orientation.dispatchEvent(new Event("change", { bubbles: true }));
  api.setPhotoOverlayFormat("landscape");
  const canvas = () => {
   const c = document.createElement("canvas"); c.width = 600;c.height = 400;
   const ctx = c.getContext("2d");ctx.fillStyle = "#a87860";ctx.fillRect(0,0,c.width,c.height);return c;
  };
  const pixels = c => c.getContext("2d").getImageData(0,0,c.width,c.height).data;
  const difference = (a,b) => {if(a.length !== b.length)throw Error("Size mismatch");let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));return max;};
  const decoded = async url => {const image=new Image();image.src=url;await image.decode();const c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext("2d").drawImage(image,0,0);return c;};
  const blank=canvas();blank.getContext("2d").clearRect(0,0,600,400);
  const template={src:blank.toDataURL(),layout:"single_photo",photoSlots:[{x:0,y:0,width:1,height:1,sourceIndex:0}]};
  const results=[];
  for(const option of [...select.options]){
   select.value=option.value;select.dispatchEvent(new Event("change",{bubbles:true}));
   const preview=await api.processCanvasThroughImagingPipeline(canvas(),{preview:true});
   const capture=await api.ensureGuestPhotoProcessed(canvas());
   const expected=new Uint8ClampedArray(pixels(capture));
   const parity=difference(pixels(preview),expected);
   if(parity!==0)throw Error(`Preview/capture mismatch for ${option.value}: ${parity}`);
   await api.ensureGuestPhotoProcessed(capture);
   if(difference(pixels(capture),expected)!==0)throw Error("Filter applied twice");
   const strip=await decoded(await api.composeStrip(template,[capture]));
   const stripDiff=difference(pixels(strip),expected);
   if(stripDiff!==0)throw Error(`Strip altered filtered pixels: ${option.value}: ${stripDiff}`);
   const final=await decoded(await api.finalizeToPrint(capture,null));
   const reference=document.createElement("canvas");reference.width=final.width;reference.height=final.height;
   reference.getContext("2d").drawImage(capture,0,0,final.width,final.height);
   const finalDiff=difference(pixels(final),pixels(reference));
   if(finalDiff>1)throw Error(`Single output altered filtered pixels: ${option.value}: ${finalDiff}`);
   results.push({preset:option.value,previewCaptureMaxDifference:parity,stripMaxDifference:stripDiff,singleMaxDifference:finalDiff});
  }
  return results;
 });
 assert.ok(results.length > 1);assert.deepEqual(errors, []);
 await page.screenshot({ path: "/tmp/guest-filter-editor-fixed.png", fullPage: true });
 console.log(JSON.stringify({ results, errors, legacySettingIgnored: true }));
});

test("beauty processing does not wait for a stalled face-tracker CDN", async ({ page }) => {
 await page.route("https://cdn.jsdelivr.net/**", () => new Promise(() => {}));
 await page.goto("http://127.0.0.1:4321/?testMode=booth", { waitUntil: "domcontentloaded" });
 const elapsed = await page.evaluate(async () => {
  const { applyBeautyFrame } = await import("/scripts/beauty/engine.mjs");
  const canvas = document.createElement("canvas");
  canvas.width = 80; canvas.height = 60;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#a87860"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const video = document.createElement("canvas");
  video.width = 80; video.height = 60;
  Object.defineProperties(video, {
   readyState: { value: 2 },
   videoWidth: { value: 80 },
   videoHeight: { value: 60 },
  });
  const startedAt = performance.now();
  await applyBeautyFrame({
   canvas,
   video,
   settings: { beauty: { enabled: true, skinSmooth: 25, tone: 10 } }
  });
  return performance.now() - startedAt;
 });
 assert.ok(elapsed < 1000, `Beauty processing took ${elapsed}ms while tracker CDN was stalled`);
});

test("face tracker transfers frames to its worker and returns landmarks", async ({ page }) => {
 await page.route("https://cdn.jsdelivr.net/**", (route) => {
  const url = route.request().url();
  if (url.endsWith("/+esm")) {
   return route.fulfill({
    contentType: "application/javascript",
    body: "export const FilesetResolver={forVisionTasks:async()=>({})};export const FaceLandmarker={createFromOptions:async()=>({detectForVideo:()=>({faceLandmarks:[[{x:0.25,y:0.5,z:0}]]})})};",
   });
  }
  return route.fulfill({ status: 200, body: "" });
 });
 await page.goto("http://127.0.0.1:4321/?testMode=booth", { waitUntil: "domcontentloaded" });
 const result = await page.evaluate(async () => {
  const { initializeFaceTracker, detectFace } = await import("/scripts/beauty/tracker.mjs?worker-check");
  const initialized = await initializeFaceTracker();
  const frame = document.createElement("canvas");
  frame.width = 320; frame.height = 240;
  Object.defineProperties(frame, {
   readyState: { value: 2 },
   videoWidth: { value: 320 },
   videoHeight: { value: 240 },
  });
  const startedAt = performance.now();
  let detection = null;
  while (performance.now() - startedAt < 1500) {
   detection = detectFace(frame);
   if (detection && detection.faceLandmarks[0]?.length) break;
   await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return {
   initialized,
   landmarkCount: detection && detection.faceLandmarks[0] ? detection.faceLandmarks[0].length : 0,
   elapsed: performance.now() - startedAt,
  };
 });
 assert.equal(result.initialized, true);
 assert.equal(result.landmarkCount, 1);
 assert.ok(result.elapsed < 1500, `worker did not return a face result in time (${result.elapsed}ms)`);
});
