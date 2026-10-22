export class StarterClient {
  site: Record<string, unknown> = { restaurant_name: "고객 매장", restaurant_phone: "고객 전화", restaurant_address: "고객 주소", settings: {menu_design_id: "basic-first-column", table_order: {orderEnabled: true}}, page_settings: {} };
  rows = new Map<string, Record<string, unknown>[]>();
  from(table: string) {
    let operation = "select", payload: Record<string, unknown> | Record<string, unknown>[] = {}, head = false;
    const execute = async () => {
      if (operation === "update") Object.assign(this.site, payload);
      if (operation === "insert") {
        const rows = (Array.isArray(payload) ? payload : [payload]).map((row, i) => ({...row, id: `${table}-${(this.rows.get(table)?.length ?? 0) + i}`}));
        this.rows.set(table, [...this.rows.get(table) ?? [], ...rows]);
        return {data: rows, error: null};
      }
      return {data: table === "menu_sites" ? this.site : null, error: null, count: head ? this.rows.get(table)?.length ?? 0 : null};
    };
    const chain = {
      select: (_fields?: string, options?: {head?: boolean}) => {head = Boolean(options?.head); return chain;},
      eq: () => chain,
      insert: (value: typeof payload) => {operation = "insert"; payload = value; return chain;},
      update: (value: typeof payload) => {operation = "update"; payload = value; return chain;},
      maybeSingle: async () => { const result = await execute(); return {...result, data: Array.isArray(result.data) ? result.data[0] : result.data}; },
      single: async () => { const result = await execute(); return {...result, data: Array.isArray(result.data) ? result.data[0] : result.data}; },
      then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => execute().then(resolve, reject),
    };
    return chain;
  }
}
