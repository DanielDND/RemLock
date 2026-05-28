import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css'; // import <widget-name>.css

const ENABLED_SETTING_ID = 'lock-automation-enabled';
const SIGNAL_MODE_SETTING_ID = 'lock-automation-signal-mode';
const WEBHOOK_URL_SETTING_ID = 'lock-automation-webhook-url';
const LOCK_MESSAGE_SETTING_ID = 'lock-automation-lock-message';
const UNLOCK_MESSAGE_SETTING_ID = 'lock-automation-unlock-message';

const DONE_DATE_KEY = 'lock-automation-done-date';
const LOCK_SENT_DATE_KEY = 'lock-automation-lock-sent-date';

type SignalMode = 'toast' | 'webhook';

function getLocalYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function sendSignal(plugin: ReactRNPlugin, kind: 'lock' | 'unlock') {
  const mode = (await plugin.settings.getSetting<string>(SIGNAL_MODE_SETTING_ID)) as SignalMode | undefined;
  const lockMessage =
    (await plugin.settings.getSetting<string>(LOCK_MESSAGE_SETTING_ID))?.trim() || 'LOCK_REMNOTE';
  const unlockMessage =
    (await plugin.settings.getSetting<string>(UNLOCK_MESSAGE_SETTING_ID))?.trim() || 'UNLOCK_REMNOTE';

  const message = kind === 'lock' ? lockMessage : unlockMessage;

  if (mode === 'toast') {
    await plugin.app.toast(message);
    return;
  }

  const webhookUrl = (await plugin.settings.getSetting<string>(WEBHOOK_URL_SETTING_ID))?.trim();
  if (!webhookUrl) {
    await plugin.app.toast('Lock automation webhook URL is not set.');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: message,
    });
  } catch (e) {
    await plugin.app.toast('Lock automation failed to send webhook.');
  }
}

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.settings.registerBooleanSetting({
    id: ENABLED_SETTING_ID,
    title: 'Enable lock automation',
    defaultValue: true,
  });

  await plugin.settings.registerDropdownSetting({
    id: SIGNAL_MODE_SETTING_ID,
    title: 'Signal mode',
    defaultValue: 'webhook',
    options: [
      { key: 'webhook', label: 'Webhook (recommended)', value: 'webhook' },
      { key: 'toast', label: 'Toast', value: 'toast' },
    ],
  });

  await plugin.settings.registerStringSetting({
    id: WEBHOOK_URL_SETTING_ID,
    title: 'Webhook URL',
    defaultValue: '',
  });

  await plugin.settings.registerStringSetting({
    id: LOCK_MESSAGE_SETTING_ID,
    title: 'Lock message',
    defaultValue: 'LOCK_REMNOTE',
  });

  await plugin.settings.registerStringSetting({
    id: UNLOCK_MESSAGE_SETTING_ID,
    title: 'Unlock message',
    defaultValue: 'UNLOCK_REMNOTE',
  });

  await plugin.app.registerCommand({
    id: 'lock-automation-send-lock',
    name: 'Lock Automation: Send lock',
    action: async () => {
      const enabled = await plugin.settings.getSetting<boolean>(ENABLED_SETTING_ID);
      if (!enabled) return;
      await sendSignal(plugin, 'lock');
    },
  });

  await plugin.app.registerCommand({
    id: 'lock-automation-send-unlock',
    name: 'Lock Automation: Send unlock',
    action: async () => {
      const enabled = await plugin.settings.getSetting<boolean>(ENABLED_SETTING_ID);
      if (!enabled) return;
      await sendSignal(plugin, 'unlock');
    },
  });

  await plugin.app.registerCommand({
    id: 'lock-automation-reset-today',
    name: 'Lock Automation: Reset today',
    action: async () => {
      await plugin.storage.setSynced(DONE_DATE_KEY, '');
      await plugin.storage.setSynced(LOCK_SENT_DATE_KEY, '');
      await plugin.app.toast('Lock automation reset.');
    },
  });

  await plugin.app.registerWidget('lock_automation_widget', WidgetLocation.FlashcardUnder, {
    dimensions: { height: 'auto', width: '100%' },
  });

  await plugin.app.waitForInitialSync();

  const enabled = await plugin.settings.getSetting<boolean>(ENABLED_SETTING_ID);
  if (!enabled) return;

  const today = getLocalYYYYMMDD(new Date());
  const doneDate = await plugin.storage.getSynced<string>(DONE_DATE_KEY);
  if (doneDate === today) return;

  const lockSentDate = await plugin.storage.getSynced<string>(LOCK_SENT_DATE_KEY);
  if (lockSentDate === today) return;

  await sendSignal(plugin, 'lock');
  await plugin.storage.setSynced(LOCK_SENT_DATE_KEY, today);
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
