const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const app = readFileSync(join(process.cwd(), "scripts", "app.js"), "utf8");
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

let getThemeSoundCue;
let MAX_THEME_SOUND_BYTES;
let resolveThemeSoundProfileName;
let THEME_SOUND_PROFILE_NAMES;
let THEME_SOUND_SLOTS;
let validateThemeSoundFile;

test.before(async () => {
  ({
    getThemeSoundCue,
    MAX_THEME_SOUND_BYTES,
    resolveThemeSoundProfileName,
    THEME_SOUND_PROFILE_NAMES,
    THEME_SOUND_SLOTS,
    validateThemeSoundFile,
  } = await import("./scripts/theme-sound-utils.mjs"));
});

test("built-in theme families receive distinct sound profiles", () => {
  assert.equal(resolveThemeSoundProfileName("wedding:timeless", {}), "elegant");
  assert.equal(resolveThemeSoundProfileName("school:hawks", {}), "school");
  assert.equal(resolveThemeSoundProfileName("fall:halloween", {}), "spooky");
  assert.equal(resolveThemeSoundProfileName("winter:christmas", {}), "holiday");
  assert.equal(resolveThemeSoundProfileName("winter:valentines", {}), "romantic");
  assert.equal(resolveThemeSoundProfileName("winter:newyear", {}), "celebration");
  assert.equal(resolveThemeSoundProfileName("expo:brandStudio", {}), "modern");
  assert.equal(resolveThemeSoundProfileName("general:birthday", {}), "celebration");
  assert.equal(resolveThemeSoundProfileName("general:basic", {}), "classic");
});

test("custom themes infer sound style from their event metadata", () => {
  assert.equal(
    resolveThemeSoundProfileName("custom:rose-gala", {
      eventTypes: ["wedding"],
      vibeSummary: "Soft candlelit celebration",
    }),
    "elegant"
  );
  assert.equal(
    resolveThemeSoundProfileName("custom:science-fair", {
      eventTypes: ["school"],
    }),
    "school"
  );
});

test("every theme sound profile covers every key booth event", () => {
  const kinds = ["tap", "countdown", "flash", "success", "qr", "goodbye"];
  THEME_SOUND_PROFILE_NAMES.forEach((profileName) => {
    kinds.forEach((kind) => {
      const cue = getThemeSoundCue("", { soundProfileName: profileName }, kind);
      assert.equal(cue.profileName, profileName);
      assert.ok(cue.tones.length > 0);
      cue.tones.forEach((tone) => {
        assert.ok(tone.frequency > 0);
        assert.ok(tone.duration > 0);
        assert.ok(tone.gain > 0);
      });
    });
  });
});

test("returned cues are isolated copies safe for runtime overrides", () => {
  const first = getThemeSoundCue("wedding:timeless", {}, "success");
  first.tones[0].frequency = 1;
  const second = getThemeSoundCue("wedding:timeless", {}, "success");
  assert.notEqual(second.tones[0].frequency, 1);
});

test("theme sound slots cover every uploadable guest-flow moment", () => {
  assert.deepEqual(
    THEME_SOUND_SLOTS.map((slot) => slot.key),
    ["start", "tap", "countdown", "photoCaptured", "shareReady", "goodbye"]
  );
  THEME_SOUND_SLOTS.forEach((slot) => {
    assert.ok(slot.label);
    assert.ok(slot.description);
    assert.ok(slot.fallbackCue);
  });
});

test("theme sound uploads accept common browser audio formats", () => {
  ["mp3", "wav", "m4a", "aac", "ogg"].forEach((extension) => {
    assert.equal(
      validateThemeSoundFile({
        name: `sound.${extension}`,
        type: "",
        size: 1024,
      }).valid,
      true
    );
  });
  assert.equal(
    validateThemeSoundFile({
      name: "sound.txt",
      type: "text/plain",
      size: 1024,
    }).valid,
    false
  );
  assert.equal(
    validateThemeSoundFile({
      name: "sound.mp3",
      type: "audio/mpeg",
      size: MAX_THEME_SOUND_BYTES + 1,
    }).valid,
    false
  );
});

test("capture settings provide per-theme sound upload controls", () => {
  assert.ok(html.includes('id="themeSoundEditor"'));
  assert.ok(html.includes('id="themeSoundSlots"'));
  assert.ok(html.includes('id="themeSoundInput"'));
  assert.ok(html.includes(".mp3,.wav,.m4a,.aac,.ogg,.oga"));
  assert.ok(app.includes("function renderThemeSoundEditor("));
  assert.ok(app.includes("function uploadThemeSound("));
  assert.ok(app.includes("function resetThemeSound("));
  assert.ok(app.includes("function previewThemeSound("));
});

test("uploaded sounds persist on the selected theme through Cloudinary", () => {
  assert.ok(app.includes("/video/upload"));
  assert.ok(app.includes("theme.soundEffects[kind] = url"));
  assert.ok(app.includes("theme.soundEffectNames[kind] = originalName"));
  assert.ok(app.includes("saveThemesToStorage();"));
  assert.ok(app.includes("getThemeAssetUploadOptionsForKey(key, \"sounds\")"));
  assert.ok(app.includes("theme.soundEffects[alternateKey] = [url]"));
});

test("uploaded sounds participate in guest cues and offline preparation", () => {
  assert.ok(app.includes('playThemeCue("start", "tap")'));
  assert.match(app, /playThemeCue\(\s*"countdown"/);
  assert.ok(app.includes('playThemeCue("goodbye", "goodbye")'));
  assert.ok(app.includes("Object.values(soundEffects).forEach((value) => {"));
});
