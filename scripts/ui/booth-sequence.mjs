/**
 * Coordinates the guest-facing booth animation sequence.
 *
 * The controller owns timing and visual state only. Capture, layout rendering,
 * upload, and QR generation stay in the existing application pipeline and are
 * supplied as hooks.
 */
export class BoothSequenceEngine {
  static STATES = Object.freeze({
    IDLE: "IDLE",
    PHOTO_CHOICE: "PHOTO_CHOICE",
    CAMERA_READY: "CAMERA_READY",
    COUNTDOWN: "COUNTDOWN",
    FLASH_CAPTURE: "FLASH_CAPTURE",
    FINALIZING: "FINALIZING",
    SHARE_REVEAL: "SHARE_REVEAL",
    THANK_YOU: "THANK_YOU"
  });

  constructor(config = {}) {
    this.root = config.root || document.getElementById("boothScreen");
    this.countdownOverlay =
      config.countdownOverlay || document.getElementById("countdownOverlay");
    this.frozenStill = config.frozenStill || document.getElementById("lastShot");
    this.cfg = {
      rippleDelay: 140,
      fadeDuration: 300,
      tickDuration: 800,
      tickGap: 200,
      flashDuration: 350,
      flashBeat: 200,
      layoutPause: 1200,
      thankYouDuration: 1400,
      autoResetTimeout: 15000,
      countdownTicks: [3, 2, 1],
      ...config
    };
    this.hooks = config.hooks || {};
    this.currentState = BoothSequenceEngine.STATES.IDLE;
    this.autoResetTimer = null;
    this.transitionToken = 0;
  }

  switchState(state, modeClass = "") {
    if (!this.root) return;
    this.currentState = state;
    [
      "welcome-active",
      "countdown-mode",
      "finalizing-mode",
      "share-mode",
      "thank-you-overlay",
      "fade-transition"
    ].forEach(
      (className) => this.root.classList.remove(className)
    );
    if (modeClass) this.root.classList.add(modeClass);
    this.hooks.onStateChange?.(state);
  }

  initIdleState() {
    this.clearAutoReset();
    this.transitionToken += 1;
    this.clearCountdown();
    this.clearFrozenStill();
    this.switchState(BoothSequenceEngine.STATES.IDLE, "welcome-active");
  }

  async handleStartTrigger() {
    if (this.currentState !== BoothSequenceEngine.STATES.IDLE) return false;
    this.hooks.playSound?.("start");
    await this.delay(this.cfg.rippleDelay);
    this.switchState(BoothSequenceEngine.STATES.PHOTO_CHOICE);
    return true;
  }

  async handleSelection(selectionType, totalPhotos = 1) {
    if (this.currentState !== BoothSequenceEngine.STATES.PHOTO_CHOICE) return false;
    this.hooks.playSound?.("click");
    await this.delay(this.cfg.rippleDelay);
    this.root?.classList.add("fade-transition");
    await this.delay(this.cfg.fadeDuration);
    this.root?.classList.remove("fade-transition");
    this.switchState(BoothSequenceEngine.STATES.CAMERA_READY);
    await this.executeCaptureSequenceLoop(selectionType, totalPhotos);
    return true;
  }

  async executeCaptureSequenceLoop(selectionType, totalPhotos = 1) {
    const frames = [];
    const count = Math.max(1, Number(totalPhotos) || 1);
    const token = ++this.transitionToken;
    for (let index = 0; index < count; index += 1) {
      if (token !== this.transitionToken) return;
      const frame = await this.captureOneFrame();
      if (!frame) return;
      frames.push(frame);
      if (index < count - 1) {
        this.hooks.updateLastShotPreview?.(frame);
        await this.delay(this.cfg.layoutPause);
      }
    }
    await this.finalizeCapturedMedia(frames, selectionType);
  }

  async captureOneFrame() {
    this.switchState(BoothSequenceEngine.STATES.COUNTDOWN, "countdown-mode");
    this.clearFrozenStill();
    for (const tick of this.cfg.countdownTicks) {
      this.showCountdown(tick);
      await this.delay(this.cfg.tickDuration);
      this.clearCountdown();
      await this.delay(this.cfg.tickGap);
    }
    await this.delay(this.cfg.flashBeat);
    this.switchState(BoothSequenceEngine.STATES.FLASH_CAPTURE);
    this.hooks.playSound?.("shutter");
    this.triggerFlash();
    const frame = await this.hooks.captureFrame?.();
    if (!frame) return null;
    this.setFrozenStill(frame);
    await this.delay(this.cfg.flashDuration);
    return frame;
  }

  async finalizeCapturedMedia(frames, selectionType) {
    this.switchState(BoothSequenceEngine.STATES.FINALIZING, "finalizing-mode");
    try {
      const composition = await this.hooks.renderFinalLayout?.(frames, selectionType);
      await this.initShareState(composition);
    } catch (error) {
      this.hooks.onError?.(error);
      this.initIdleState();
    }
  }

  async initShareState(mediaAsset) {
    this.switchState(BoothSequenceEngine.STATES.SHARE_REVEAL, "share-mode");
    this.hooks.revealSharePanel?.(mediaAsset);
    if (!navigator.onLine) this.hooks.showOfflineNotice?.();
    const qrReady = await this.hooks.renderQr?.(mediaAsset);
    if (qrReady) {
      this.hooks.playSound?.("share-ready");
      this.hooks.startQrBreathing?.();
    }
    this.startAutoResetTimer();
  }

  async terminateSession() {
    this.clearAutoReset();
    this.switchState(BoothSequenceEngine.STATES.THANK_YOU, "thank-you-overlay");
    this.hooks.playSound?.("goodbye");
    await this.delay(this.cfg.thankYouDuration);
    this.hooks.clearSession?.();
    this.initIdleState();
  }

  showCountdown(value) {
    if (!this.countdownOverlay) return;
    this.countdownOverlay.textContent = String(value);
    this.countdownOverlay.classList.remove("show", "tick-pop");
    void this.countdownOverlay.offsetWidth;
    this.countdownOverlay.classList.add("show", "tick-pop");
    this.hooks.playSound?.("countdown", value);
  }

  clearCountdown() {
    if (!this.countdownOverlay) return;
    this.countdownOverlay.classList.remove("show", "tick-pop");
    this.countdownOverlay.textContent = "";
  }

  triggerFlash() {
    this.hooks.triggerFlash?.();
  }

  setFrozenStill(frame) {
    if (!this.frozenStill || typeof frame !== "string") return;
    this.frozenStill.src = frame;
    this.frozenStill.style.display = "block";
  }

  clearFrozenStill() {
    if (!this.frozenStill) return;
    this.frozenStill.removeAttribute("src");
    this.frozenStill.style.display = "none";
  }

  startAutoResetTimer() {
    this.clearAutoReset();
    this.autoResetTimer = setTimeout(
      () => this.terminateSession(),
      this.cfg.autoResetTimeout
    );
  }

  clearAutoReset() {
    if (this.autoResetTimer) clearTimeout(this.autoResetTimer);
    this.autoResetTimer = null;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
