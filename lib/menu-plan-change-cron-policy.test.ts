import assert from 'node:assert/strict';
import test from 'node:test';
import {resolvePlanChangeRenewalExecution} from './menu-plan-change-cron-policy';
test('approved scheduled opt-in renewals do not require enabling legacy charging',()=>{
 const legacy={execute:false,dryRun:true};
 assert.equal(resolvePlanChangeRenewalExecution({...legacy,trigger:'get',ledgerReady:true,enabled:true}),true);
 assert.deepEqual(legacy,{execute:false,dryRun:true});
});
test('manual dry-run stays read-only even while scheduled plan changes are enabled',()=>{
 for(const execute of [false,true])assert.equal(resolvePlanChangeRenewalExecution({trigger:'post',ledgerReady:true,enabled:true,execute,dryRun:true}),false);
 assert.equal(resolvePlanChangeRenewalExecution({trigger:'post',ledgerReady:true,enabled:true,execute:false,dryRun:false}),false);
 assert.equal(resolvePlanChangeRenewalExecution({trigger:'post',ledgerReady:true,enabled:true,execute:true,dryRun:false}),true);
});
test('legacy execution cannot bypass the new reservation readiness or execution gates',()=>{
 for(const trigger of ['get','post'] as const){
  assert.equal(resolvePlanChangeRenewalExecution({trigger,ledgerReady:false,enabled:true,execute:true,dryRun:false}),false);
  assert.equal(resolvePlanChangeRenewalExecution({trigger,ledgerReady:true,enabled:false,execute:true,dryRun:false}),false);
 }
});
