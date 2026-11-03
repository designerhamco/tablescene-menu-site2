import { getDashboardBrowserNotificationPreferenceKey, type DashboardArrivalKind, type DashboardBrowserNotificationPermission } from "./dashboard-arrival-alerts";

export type OperationalSoundPreference = { receiveEnabled: boolean; enabled: boolean; tone: "chime" | "bell" | "beep"; volume: number; repeat: 1 | 3 | 5 };
export const DEFAULT_OPERATIONAL_SOUND: OperationalSoundPreference = { receiveEnabled: false, enabled: true, tone: "chime", volume: 50, repeat: 1 };
export const OPERATIONAL_SOUND_CHANGED = "artimenu:operational-sound-changed";
export function operationalSoundKey(menuSiteId: string, kind: DashboardArrivalKind) { return `artimenu:operation-sound:${menuSiteId}:${kind}`; }
export function normalizeOperationalSound(value: unknown): OperationalSoundPreference {
  const p = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { receiveEnabled: p.receiveEnabled === true, enabled: p.enabled !== false, tone: p.tone === "bell" || p.tone === "beep" ? p.tone : "chime",
    volume: typeof p.volume === "number" && Number.isFinite(p.volume) ? Math.max(0, Math.min(100, Math.round(p.volume / 25) * 25)) : 50,
    repeat: p.repeat === 3 || p.repeat === 5 ? p.repeat : 1 };
}
export function readOperationalSound(menuSiteId: string, kind: DashboardArrivalKind): OperationalSoundPreference {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(operationalSoundKey(menuSiteId, kind)) ?? "null");
    const preference = normalizeOperationalSound(raw);
    // Keep the existing opt-in when moving the old history-screen control into settings.
    if (!raw || typeof raw !== "object" || !("receiveEnabled" in raw))
      preference.receiveEnabled = window.localStorage.getItem(getDashboardBrowserNotificationPreferenceKey({ menuSiteId, kind })) === "enabled";
    return preference;
  }
  catch { return { ...DEFAULT_OPERATIONAL_SOUND }; }
}
export function saveOperationalSound(menuSiteId: string, kind: DashboardArrivalKind, value: OperationalSoundPreference) {
  window.localStorage.setItem(operationalSoundKey(menuSiteId, kind), JSON.stringify(normalizeOperationalSound(value)));
  window.dispatchEvent(new Event(OPERATIONAL_SOUND_CHANGED));
}

let audioContext: AudioContext | null = null;
let playing: OscillatorNode[] = [];
/** This module only accesses audio in explicit client calls; no audio runs while rendering. */
export function stopOperationalSound() {
  playing.forEach(node => { try { node.stop(); } catch { /* Already completed. */ } });
  playing = [];
}
export async function playOperationalSound(preference: OperationalSoundPreference): Promise<boolean> {
  const p = normalizeOperationalSound(preference);
  if (!p.enabled || p.volume === 0) return true;
  try {
    if (!audioContext || audioContext.state === "closed") audioContext = new window.AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    if (audioContext.state !== "running") return false;
    stopOperationalSound();
    const context = audioContext;
    const frequencies = p.tone === "bell" ? [880, 1174.66] : p.tone === "beep" ? [740] : [659.25, 783.99];
    for (let repeat = 0; repeat < p.repeat; repeat++) frequencies.forEach((frequency, index) => {
      const start = context.currentTime + repeat * 0.9 + index * 0.18;
      const gain = context.createGain(), oscillator = context.createOscillator();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18 * p.volume / 100, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      gain.connect(context.destination); oscillator.type = "sine"; oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain); playing.push(oscillator);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); playing = playing.filter(node => node !== oscillator); };
      oscillator.start(start); oscillator.stop(start + 0.42);
    });
    return true;
  } catch { return false; }
}

export function getOperationalBrowserPermission(): DashboardBrowserNotificationPermission {
  return "Notification" in window ? window.Notification.permission : "unsupported";
}
/** Called only from the settings save gesture; no permission prompt during monitoring. */
export async function enableOperationalAlerts(preference: OperationalSoundPreference) {
  let permission = getOperationalBrowserPermission();
  // Start audio from the gesture before awaiting the browser permission prompt.
  const sound = playOperationalSound(preference);
  try { if (permission === "default") permission = await window.Notification.requestPermission(); }
  catch { permission = getOperationalBrowserPermission(); }
  return { permission, soundReady: await sound };
}
