// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ComponentRegistry, WorkspaceStore, PreferencesUIStore } = require('mailspring-exports');
import AISidebarPanel from './ai-sidebar-panel';
import AIThreadSidebarPreferences from './preferences';

const PREFERENCES_TAB_ID = 'MailspringAICopilot';

let preferencesTab: any = null;

export function activate() {
  ComponentRegistry.register(AISidebarPanel, {
    location: WorkspaceStore.Location.MessageListSidebar,
  });

  if (PreferencesUIStore && PreferencesUIStore.TabItem) {
    preferencesTab = new PreferencesUIStore.TabItem({
      tabId: PREFERENCES_TAB_ID,
      displayName: 'Mailspring AI Copilot',
      componentClassFn: () => AIThreadSidebarPreferences,
    });
    PreferencesUIStore.registerPreferencesTab(preferencesTab);
  }
}

export function deactivate() {
  ComponentRegistry.unregister(AISidebarPanel);
  if (preferencesTab) {
    PreferencesUIStore.unregisterPreferencesTab(PREFERENCES_TAB_ID);
    preferencesTab = null;
  }
}

export function serialize() {
  return {};
}
