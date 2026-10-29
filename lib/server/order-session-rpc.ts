import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Additive migration contract. Keep generated Production types unchanged until its
// separately approved application, then replace this adapter with generated RPC types.
type Args = {
  register_table_terminal_visit: {p_menu_site_id:string;p_table_id:string;p_token_hash:string;p_user_agent_hash:string;p_previous_token_hash:string|null};
  resolve_order_visit_access: {p_menu_site_id: string; p_session_id: string};
  extend_table_order_access: {p_menu_site_id: string; p_session_id: string; p_rescan: boolean};
  submit_postpay_order_v3: {p_menu_site_id: string; p_table_visit_session_id: string; p_client_request_id: string; p_request_text: string | null; p_lines: unknown; p_notification_phone: string | null; p_repeat_order_id: string | null};
};
export async function orderSessionRpc<N extends keyof Args>(name: N, args: Args[N]) {
  const db = createAdminClient();
  const rpc = db.rpc.bind(db) as unknown as (name: N, args: Args[N]) => Promise<{
    data: unknown; error: {message: string; code?: string; details?: string} | null;
  }>;
  return rpc(name, args);
}
