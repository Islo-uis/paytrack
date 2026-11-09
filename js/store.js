(function(PT){
  'use strict';
  const listeners=new Set();
  let txs=[],settings={};
  function init(){
    txs=PT.storage.loadTransactions(PT.data.sampleTransactions());
    settings=PT.storage.loadSettings(PT.data.DEFAULT_SETTINGS);
    if(!Array.isArray(settings.providers)||!settings.providers.length)settings.providers=PT.data.PROVIDERS.slice();
    txs=txs.filter(function(t){return t&&t.id}).map(function(t){t.amount=Number(t.amount)||0;t.log=Array.isArray(t.log)?t.log:[];return t});
  }
  function persist(){return PT.storage.saveTransactions(txs)}
  function emit(){listeners.forEach(function(fn){try{fn()}catch(e){console.error(e)}})}
  function subscribe(fn){listeners.add(fn);return function(){listeners.delete(fn)}}
  function all(){return txs.slice()}
  function get(id){return txs.find(function(t){return t.id===id})||null}
  function getSettings(){return settings}
  function nextId(){let m=0;txs.forEach(function(t){const r=/^TXN-(\d+)$/.exec(t.id||'');if(r)m=Math.max(m,parseInt(r[1],10))});return 'TXN-'+String(m+1).padStart(4,'0')}
  function findByReference(ref,excludeId){
    const r=String(ref||'').trim().toLowerCase();if(!r)return null;
    return txs.find(function(t){return t.id!==excludeId&&String(t.reference||'').trim().toLowerCase()===r})||null;
  }
  function add(data){
    const now=new Date().toISOString();
    const tx=Object.assign({id:nextId(),createdAt:now,recordedBy:settings.owner||'Staff',notes:'',receiptImage:null,log:[]},data);
    tx.log=(tx.log||[]).concat([{ts:now,action:'Transaction recorded from scanned receipt',by:tx.recordedBy}]);
    txs.unshift(tx);persist();emit();return tx;
  }
  function update(id,patch,logAction){
    const tx=get(id);if(!tx)return null;
    Object.assign(tx,patch);
    if(logAction){tx.log=tx.log||[];tx.log.push({ts:new Date().toISOString(),action:logAction,by:settings.owner||'Staff'})}
    persist();emit();return tx;
  }
  function remove(id){const i=txs.findIndex(function(t){return t.id===id});if(i===-1)return false;txs.splice(i,1);persist();emit();return true}
  function saveSettings(patch){settings=Object.assign({},settings,patch);PT.storage.saveSettings(settings);emit();return settings}
  function resetDemo(){txs=PT.data.sampleTransactions();persist();emit()}
  function clearTransactions(){txs=[];persist();emit()}
  function pendingCount(){return txs.filter(function(t){return t.paymentStatus==='Pending Verification'}).length}
  PT.store={init,subscribe,all,get,nextId,add,update,remove,findByReference,getSettings,saveSettings,resetDemo,clearTransactions,pendingCount};
})(window.PT);
