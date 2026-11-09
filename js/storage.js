(function(PT){
  'use strict';
  const KEYS={tx:'paytrack.tx.v1',settings:'paytrack.settings.v1',apiKey:'paytrack.gemini.v1'};
  function rj(k,fb){try{const r=localStorage.getItem(k);if(!r)return fb;const p=JSON.parse(r);return p==null?fb:p}catch(e){return fb}}
  function wj(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
  function loadTransactions(fb){const l=rj(KEYS.tx,null);return Array.isArray(l)?l:fb}
  function saveTransactions(l){return wj(KEYS.tx,l)}
  function loadSettings(fb){return Object.assign({},fb,rj(KEYS.settings,{}))}
  function saveSettings(s){return wj(KEYS.settings,s)}
  function loadApiKey(){try{return localStorage.getItem(KEYS.apiKey)||''}catch(e){return ''}}
  function saveApiKey(k){try{if(k)localStorage.setItem(KEYS.apiKey,String(k).trim());else localStorage.removeItem(KEYS.apiKey);return true}catch(e){return false}}
  PT.storage={KEYS,loadTransactions,saveTransactions,loadSettings,saveSettings,loadApiKey,saveApiKey};
})(window.PT);
