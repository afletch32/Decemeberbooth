const test = require("node:test");
const assert = require("node:assert/strict");

test("merging a stale catalog preserves themes added remotely", async () => {
  const { mergeThemeCatalog } = await import("./scripts/theme-sync-utils.mjs");
  const existing = {
    general: { themes: { wedding: { name: "Wedding" }, newer: { name: "New" } } },
    _meta: { font: "serif", repairVersion: 3 },
  };
  const staleSave = {
    general: { themes: { wedding: { name: "Updated Wedding" } } },
    _meta: { font: "sans" },
  };

  assert.deepEqual(mergeThemeCatalog(existing, staleSave), {
    general: {
      themes: {
        wedding: { name: "Updated Wedding" },
        newer: { name: "New" },
      },
    },
    _meta: { font: "sans", repairVersion: 3 },
  });
});

test("theme catalog merge preserves unrelated groups and holiday records", async () => {
  const { mergeThemeCatalog } = await import("./scripts/theme-sync-utils.mjs");
  const existing = {
    school: { themes: { hawks: { name: "Hawks" } } },
    fall: { holidays: { halloween: { name: "Halloween" } } },
  };

  assert.deepEqual(
    mergeThemeCatalog(existing, {
      fall: { holidays: { halloween: { name: "Updated Halloween" } } },
    }),
    {
      school: { themes: { hawks: { name: "Hawks" } } },
      fall: {
        holidays: { halloween: { name: "Updated Halloween" } },
      },
    }
  );
});

test("theme catalog merge rejects non-object payloads", async () => {
  const { mergeThemeCatalog } = await import("./scripts/theme-sync-utils.mjs");
  assert.throws(() => mergeThemeCatalog({}, []), /must be an object/);
});
