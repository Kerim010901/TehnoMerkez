import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData,saveOrder,trackOrder,filterOrders,isOverdue,summary,csvCell,validState,localDay} from '../dist/model.js';
import {dictionaries} from '../dist/i18n.js';

test('a new repair persists references and creates an immutable history entry',()=>{
 const state=seedData(),data={customer:'c1',technician:'t2',device:'Test laptop',problem:'Broken screen',status:'received',priority:'normal',deadline:localDay(),cost:250,serial:'TEST',note:'Received'};
 const next=saveOrder(state,data);assert.equal(next.orders.length,state.orders.length+1);assert.equal(state.orders.length,10);assert.equal(next.orders[0].id,'TM-1051');assert.equal(next.orders[0].history[0].note,'Received');
 const updated=saveOrder(next,{...next.orders[0],status:'diagnosis',note:'Testing display'},next.orders[0].id);
 assert.equal(updated.orders[0].history.length,2);assert.equal(next.orders[0].history.length,1);assert.equal(updated.orders[0].token,next.orders[0].token);assert.equal(updated.orders[0].history[0].status,'received');
});
test('rejects invalid costs, dates and disconnected references',()=>{
 const state=seedData(),o=state.orders[0];
 for(const patch of [{cost:-1},{cost:NaN},{deadline:'2026-02-30'},{deadline:'bad'},{customer:'missing'},{technician:'missing'},{status:'oops'}])assert.throws(()=>saveOrder(state,{...o,...patch},o.id));
});
test('tracking requires both matching credentials and exposes no customer details',()=>{
 const state=seedData();assert.equal(trackOrder(state,'TM-1041','wrong'),null);const found=trackOrder(state,' tm-1041 ',' demo-1041 ');assert.equal(found.device,'Lenovo ThinkPad T14');assert.deepEqual(Object.keys(found).sort(),['cost','deadline','device','id','status']);
});
test('ready and completed orders are not overdue; summary is consistent',()=>{
 assert.equal(isOverdue({status:'ready',deadline:'2020-01-01'}),false);assert.equal(isOverdue({status:'completed',deadline:'2020-01-01'}),false);assert.equal(isOverdue({status:'repair',deadline:'2020-01-01'}),true);
 const s=summary(seedData().orders);assert.equal(s.active,6);assert.equal(s.ready,2);assert.equal(s.completed,2);assert.equal(s.total,700);
});
test('search, status and date filters combine',()=>{
 const state=seedData();assert.equal(filterOrders(state,{query:'Merdan',status:'repair'}).length,1);assert.equal(filterOrders(state,{query:'TM-1041'}).length,1);assert.equal(filterOrders(state,{from:localDay(),to:localDay()}).length,2);
});
test('CSV escapes quotes and formula-like content',()=>{
 assert.equal(csvCell('a"b'),'"a""b"');assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('  @SUM(1)'),'"\'  @SUM(1)"');
});
test('backup validates relationships and all interface dictionaries have identical keys',()=>{
 const state=seedData();assert.equal(validState(JSON.parse(JSON.stringify(state))),true);assert.equal(validState({version:1,orders:[],customers:null}),false);state.customers=[];assert.equal(validState(state),false);
 for(const l of ['tk','en'])assert.deepEqual(Object.keys(dictionaries[l]).sort(),Object.keys(dictionaries.ru).sort());
});
