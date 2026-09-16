"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.serialize = serialize;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ComponentRegistry, WorkspaceStore, PreferencesUIStore } = require('mailspring-exports');
const ai_sidebar_panel_1 = __importDefault(require("./ai-sidebar-panel"));
const preferences_1 = __importDefault(require("./preferences"));
const PREFERENCES_TAB_ID = 'MailspringAICopilot';
let preferencesTab = null;
function activate() {
    ComponentRegistry.register(ai_sidebar_panel_1.default, {
        location: WorkspaceStore.Location.MessageListSidebar,
    });
    if (PreferencesUIStore && PreferencesUIStore.TabItem) {
        preferencesTab = new PreferencesUIStore.TabItem({
            tabId: PREFERENCES_TAB_ID,
            displayName: 'Mailspring AI Copilot',
            componentClassFn: () => preferences_1.default,
        });
        PreferencesUIStore.registerPreferencesTab(preferencesTab);
    }
}
function deactivate() {
    ComponentRegistry.unregister(ai_sidebar_panel_1.default);
    if (preferencesTab) {
        PreferencesUIStore.unregisterPreferencesTab(PREFERENCES_TAB_ID);
        preferencesTab = null;
    }
}
function serialize() {
    return {};
}
