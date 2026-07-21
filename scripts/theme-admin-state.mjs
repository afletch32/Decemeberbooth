function createStateField(initialValue = "") {
  let value = String(initialValue ?? "");
  const listeners = new Map();

  return {
    get value() {
      return value;
    },
    set value(nextValue) {
      value = String(nextValue ?? "");
    },
    addEventListener(type, listener) {
      if (typeof listener !== "function") return;
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    emit(type) {
      (listeners.get(type) || []).forEach((listener) =>
        listener({ target: this })
      );
    },
  };
}

export function createThemeAdminState() {
  let selectedThemeKey = "";
  let themeOptions = [];

  return {
    editor: {
      mode: createStateField("edit"),
      eventType: createStateField("general"),
      name: createStateField(),
      welcomeTitle: createStateField(),
      welcomePrompt: createStateField(),
      accent: createStateField("#ff0000"),
      accent2: createStateField("#ffffff"),
      bannerSize: createStateField("64"),
      welcomeTitleSize: createStateField("56"),
    },
    getSelectedThemeKey() {
      return selectedThemeKey;
    },
    setSelectedThemeKey(key) {
      const normalized = String(key || "");
      if (
        normalized &&
        !themeOptions.some((option) => option.value === normalized)
      ) {
        return false;
      }
      selectedThemeKey = normalized;
      return true;
    },
    getThemeOptions() {
      return themeOptions.map((option) => ({ ...option }));
    },
    setThemeOptions(options) {
      themeOptions = (Array.isArray(options) ? options : [])
        .filter((option) => option && option.value)
        .map((option) => ({
          value: String(option.value),
          textContent: String(option.textContent || option.label || option.value),
        }));
      if (!themeOptions.some((option) => option.value === selectedThemeKey)) {
        selectedThemeKey = themeOptions[0]?.value || "";
      }
    },
    resetEditorDraft() {
      this.editor.name.value = "";
      this.editor.welcomeTitle.value = "";
      this.editor.welcomePrompt.value = "";
      this.editor.accent.value = "#ff0000";
      this.editor.accent2.value = "#ffffff";
    },
  };
}
