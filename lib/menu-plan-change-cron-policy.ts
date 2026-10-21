/** New opt-in renewals have a separate execution gate from legacy subscriptions. */
export function resolvePlanChangeRenewalExecution(input:{trigger:'get'|'post';ledgerReady:boolean;enabled:boolean;execute:boolean;dryRun:boolean}) {
  return input.ledgerReady&&input.enabled&&(input.trigger==='get'||input.execute&&!input.dryRun);
}
