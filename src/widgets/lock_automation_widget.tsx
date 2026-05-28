import { AppEvents, type RNPlugin, renderWidget, useAPIEventListener, usePlugin } from '@remnote/plugin-sdk';

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

async function sendSignal(plugin: RNPlugin, kind: 'lock' | 'unlock') {
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

export const LockAutomationWidget = () => {
  const plugin = usePlugin();

  useAPIEventListener(AppEvents.QueueCompleteCard, undefined, async () => {
    const enabled = await plugin.settings.getSetting<boolean>(ENABLED_SETTING_ID);
    if (!enabled) return;

    const today = getLocalYYYYMMDD(new Date());
    const doneDate = await plugin.storage.getSynced<string>(DONE_DATE_KEY);
    if (doneDate === today) return;

    const remaining = await plugin.queue.getNumRemainingCards();
    if (remaining !== 0) return;

    await sendSignal(plugin, 'unlock');
    await plugin.storage.setSynced(DONE_DATE_KEY, today);
    await plugin.storage.setSynced(LOCK_SENT_DATE_KEY, '');
  });

  return null;
};

renderWidget(LockAutomationWidget);
