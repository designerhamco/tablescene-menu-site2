import "server-only";
import { cookies, headers } from "next/headers";
import { TABLE_VISIT_SESSION_COOKIE } from "@/lib/table-qr-session-tokens";
import { detectTerminalDevice, type OrderPointDeviceSettings } from "@/lib/terminal-device-info";
import { getCurrentTableTerminalId, listTableTerminalConnections } from "./table-terminal-service";

/** Called only after owner settings and point access checks. No credentials leave the server. */
export async function loadOrderPointDeviceSettings(menuSiteId: string): Promise<OrderPointDeviceSettings> {
  const requestHeaders = await headers(), cookieStore = await cookies();
  const ua = requestHeaders.get("user-agent") ?? "", token = cookieStore.get(TABLE_VISIT_SESSION_COOKIE)?.value;
  const state: OrderPointDeviceSettings = { currentDevice: detectTerminalDevice(ua), currentTableId: null,
    connectionStatusAvailable: true, connectionsAvailable: true, connections: [] };
  try { state.currentTableId = await getCurrentTableTerminalId(menuSiteId, token, ua); }
  catch { state.connectionStatusAvailable = false; }
  try {
    state.connections = await listTableTerminalConnections(menuSiteId, token, ua);
    state.currentTableId = state.connections.find(connection => connection.current)?.tableId ?? null;
    state.connectionStatusAvailable = true;
  } catch { state.connectionsAvailable = false; }
  return state;
}
