import { STANDARD_DOUBLE_COLUMN_STRIP_SLOTS } from "./strip-layout-utils.mjs";
import {
  migrateHalloweenEventAssets,
  migrateHalloweenThemeAssets,
} from "./halloween-assets.mjs";
import { CanvasBuffer, offscreenToDataURL } from "./canvas-utils.mjs";
import {
  buildBoothVideoUrl,
  buildCloudinaryImageTransformationUrl,
  buildAssetIndexKey,
  buildDateSessionFolderPath,
  buildEventAssetFolderPath,
  buildEventFolderPath,
  getCloudinaryDerivedUrl,
} from "./cloudinary-utils.mjs";
import { clampZoom } from "./camera-utils.mjs";
import {
  applyThemeText,
  getEventTextOverrides,
  hasEventTextOverrides,
  inferThemeEventStyle,
  mergeUniqueUrls,
  normalizeEventStyle,
} from "./event-utils.mjs";
import {
  normalizeTemplateTextFields,
  resolveTemplateTextRect,
  resolveTemplateTextValue,
  validateCreatePathEventDetails,
} from "./template-text-utils.mjs";
import { formatRecordingTime } from "./recording-utils.mjs";
import { shouldEnableRemoteSync } from "./remote-sync-utils.mjs";
import { getGuestVisibleBeautyPresets } from "./beauty/presets.mjs";
import { createThemeAdminState } from "./theme-admin-state.mjs";
import { pruneUnapprovedThemes } from "./theme-catalog-utils.mjs";
import {
  detectEditableFieldsFromText,
  getAssetEditableFieldLabel,
  getAssetLibraryId,
  getAssetLibraryUrlKey,
  normalizeAssetLibraryPayload as normalizeAssetLibraryRecords,
  normalizeAssetTags,
  normalizeEditableFields,
  normalizeIdleButtonZone,
  normalizeIdleScreenOrientation,
  normalizeLegacyAssetUrl,
  normalizeUploadedAssetCategory,
} from "./asset-library-utils.mjs";
import {
  filterAssetLibraryRows,
  getAssetLibraryFilterCategories,
  themeKeyToCategory,
} from "./asset-library-view.mjs";
import {
  loadEmailJsLibrary,
  loadQrCodeLibrary,
  loadSelfieSegmentationLibrary,
} from "./external-library-loader.mjs";
import {
  getVideoPreviewPosterSrc,
  resolvePreviewAssetSrc,
} from "./media-preview-utils.mjs";
import {
  getThemeSoundCue,
  resolveThemeSoundProfileName,
  THEME_SOUND_SLOTS,
  validateThemeSoundFile,
} from "./theme-sound-utils.mjs";
import { createAppState } from "./app/state.mjs";
import { createViewportModule } from "./app/booth/viewport.mjs";
import { createSessionAssetsModule } from "./app/setup/session-assets.mjs";
import { createThemePickerModule } from "./app/setup/theme-picker.mjs";
import { createEventProfileModule } from "./app/setup/event-profile.mjs";
import { createEditorControlsModule } from "./app/themes/editor-controls.mjs";
import { createEventEditorModule } from "./app/setup/event-editor.mjs";
import { createCaptureSettingsModule } from "./app/setup/capture-settings.mjs";
import { createNavigationModule } from "./app/setup/navigation.mjs";
import { createRemoteModule } from "./app/sync/remote.mjs";
import { createServicesModule } from "./app/settings/services.mjs";
import { createRenderingModule } from "./app/booth/rendering.mjs";
import { createImagingModule } from "./app/booth/imaging.mjs";
import { createCaptureFlowModule } from "./app/booth/capture-flow.mjs";
import { createFinalOutputModule } from "./app/sharing/final-output.mjs";
import { createEventPersistenceModule } from "./app/events/event-persistence.mjs";
import { createOfflineDeliveryModule } from "./app/sharing/offline-delivery.mjs";
import { createLibrarySyncModule } from "./app/assets/library-sync.mjs";
import { createLibraryUiModule } from "./app/assets/library-ui.mjs";
import { createCatalogStorageModule } from "./app/themes/catalog-storage.mjs";
import { createFontPickerModule } from "./app/themes/font-picker.mjs";
import { createEditorManagementModule } from "./app/themes/editor-management.mjs";
import { createNormalizationModule } from "./app/themes/normalization.mjs";
import { createOperationsModule } from "./app/assets/operations.mjs";
import { createLifecycleModule } from "./app/lifecycle.mjs";

const dependencies = {
  STANDARD_DOUBLE_COLUMN_STRIP_SLOTS,
  migrateHalloweenEventAssets,
  migrateHalloweenThemeAssets,
  CanvasBuffer,
  offscreenToDataURL,
  buildBoothVideoUrl,
  buildCloudinaryImageTransformationUrl,
  buildAssetIndexKey,
  buildDateSessionFolderPath,
  buildEventAssetFolderPath,
  buildEventFolderPath,
  getCloudinaryDerivedUrl,
  clampZoom,
  applyThemeText,
  getEventTextOverrides,
  hasEventTextOverrides,
  inferThemeEventStyle,
  mergeUniqueUrls,
  normalizeEventStyle,
  normalizeTemplateTextFields,
  resolveTemplateTextRect,
  resolveTemplateTextValue,
  validateCreatePathEventDetails,
  formatRecordingTime,
  shouldEnableRemoteSync,
  getGuestVisibleBeautyPresets,
  createThemeAdminState,
  pruneUnapprovedThemes,
  detectEditableFieldsFromText,
  getAssetEditableFieldLabel,
  getAssetLibraryId,
  getAssetLibraryUrlKey,
  normalizeAssetLibraryRecords,
  normalizeAssetTags,
  normalizeEditableFields,
  normalizeIdleButtonZone,
  normalizeIdleScreenOrientation,
  normalizeLegacyAssetUrl,
  normalizeUploadedAssetCategory,
  filterAssetLibraryRows,
  getAssetLibraryFilterCategories,
  themeKeyToCategory,
  loadEmailJsLibrary,
  loadQrCodeLibrary,
  loadSelfieSegmentationLibrary,
  getVideoPreviewPosterSrc,
  resolvePreviewAssetSrc,
  getThemeSoundCue,
  resolveThemeSoundProfileName,
  THEME_SOUND_SLOTS,
  validateThemeSoundFile,
};
const app = createAppState(dependencies);
for (const createModule of [createViewportModule, createSessionAssetsModule, createThemePickerModule, createEventProfileModule, createEditorControlsModule, createEventEditorModule, createCaptureSettingsModule, createNavigationModule, createRemoteModule, createServicesModule, createRenderingModule, createImagingModule, createCaptureFlowModule, createFinalOutputModule, createEventPersistenceModule, createOfflineDeliveryModule, createLibrarySyncModule, createLibraryUiModule, createCatalogStorageModule, createFontPickerModule, createEditorManagementModule, createNormalizationModule, createOperationsModule]) {
  Object.assign(app, createModule(app));
}
app.startCameraFlow = (...args) => app.startCamera(...args);
app.startBoothFromAdmin = (...args) => app.startBooth(...args);
Object.assign(app, createLifecycleModule(app));
app.installLifecycle();
