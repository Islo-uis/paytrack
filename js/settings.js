(function(PT){
  'use strict';
  const U=PT.utils;
  PT.pages=PT.pages||{};
  const MODELS=['gemini-2.0-flash','gemini-2.0-flash-001','gemini-1.5-flash','gemini-1.5-flash-8b','gemini-2.5-flash'];
  PT.pages.settings={
    title:'Settings',subtitle:'Business profile, AI configuration and providers',
    render:function(root){
      this.root=root;
      const s=PT.store.getSettings();
      const curKey=PT.storage.loadApiKey();
      const masked=curKey?curKey.slice(0,6)+'…'+curKey.slice(-4):'';
      const providerChecks=PT.data.PROVIDERS.map(function(p){
        const c=(s.providers||[]).indexOf(p)>-1?' checked':'';
        return '<label class="check"><input type="checkbox" data-provider="'+U.esc(p)+'"'+c+'> '+U.esc(p)+'</label>';
      }).join('');
      const modelOpts=MODELS.map(function(m){return '<option value="'+U.esc(m)+'"'+(s.geminiModel===m?' selected':'')+'>'+U.esc(m)+'</option>'}).join('');
      const apiStatus=curKey?'<span class="badge badge-verified">Key saved · '+U.esc(masked)+'</span>':'<span class="badge badge-pending">No API key configured</span>';
      root.innerHTML='<div class="page-head"><div><h2>Settings</h2><p>Preferences saved in this browser only.</p></div></div>'+
        '<section class="card" style="margin-bottom:16px"><div class="card-head"><h3>AI Configuration (Google Gemini)</h3>'+apiStatus+'</div><div class="card-body">'+
        '<div class="callout callout-danger" style="margin-bottom:14px"><strong>Security notice.</strong> This demo calls Gemini directly from your browser. Your API key is stored in <code>localStorage</code> and visible to anyone who opens DevTools. Use a <strong>dedicated demo key</strong> with a billing cap. Revoke the key after your pitch.</div>'+
        '<div class="form-grid"><div class="field span-2"><label for="s-gemini-key">Gemini API key</label><div style="display:flex;gap:8px"><input class="input mono" id="s-gemini-key" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="'+U.esc(curKey)+'"><button class="btn" type="button" id="toggleKey">Show</button></div><span class="hint">Get a key at aistudio.google.com/apikey — it starts with “AIza”.</span></div>'+
        '<div class="field"><label for="s-gemini-model">Model</label><select class="input" id="s-gemini-model">'+modelOpts+'</select><span class="hint">“gemini-2.0-flash” is fast and cheap.</span></div>'+
        '<div class="field"><label>&nbsp;</label><div style="display:flex;gap:8px"><button class="btn" type="button" id="testKey">Test connection</button><button class="btn btn-ghost" type="button" id="clearKey">Clear key</button></div></div></div>'+
        '<div id="testResult" style="margin-top:6px"></div>'+
        '<label class="check" style="margin-top:14px"><input type="checkbox" id="s-key-ack"> I understand this key is stored in my browser and must not be shared.</label>'+
        '</div></section>'+
        '<div class="grid-2"><section class="card"><div class="card-head"><h3>Business information</h3></div><div class="card-body"><div class="form-grid">'+
        '<div class="field span-2"><label for="s-biz">Business name</label><input class="input" id="s-biz" type="text" value="'+U.esc(s.businessName)+'"></div>'+
        '<div class="field"><label for="s-owner">Owner / manager</label><input class="input" id="s-owner" type="text" value="'+U.esc(s.owner)+'"></div>'+
        '<div class="field"><label for="s-role">Role</label><input class="input" id="s-role" type="text" value="'+U.esc(s.role)+'"></div>'+
        '<div class="field"><label for="s-email">Email</label><input class="input" id="s-email" type="email" value="'+U.esc(s.email)+'"></div>'+
        '<div class="field"><label for="s-phone">Mobile</label><input class="input" id="s-phone" type="text" value="'+U.esc(s.phone)+'"></div>'+
        '<div class="field span-2"><label for="s-address">Address</label><input class="input" id="s-address" type="text" value="'+U.esc(s.address)+'"></div>'+
        '</div></div></section>'+
        '<section class="card"><div class="card-head"><h3>Providers &amp; display</h3></div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'+providerChecks+'</div><div class="form-grid"><div class="field"><label>Rows per page</label><select class="input" id="s-rows">'+[5,8,12,20].map(function(n){return '<option value="'+n+'"'+(Number(s.rowsPerPage)===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select></div></div></div></section></div>'+
        '<div class="form-actions" style="justify-content:flex-start;margin:16px 0 24px"><button class="btn btn-primary" type="button" id="saveSettings">Save settings</button><button class="btn" type="button" id="resetSettings">Restore defaults</button></div>'+
        '<section class="card"><div class="card-head"><h3>Demo data</h3></div><div class="card-body"><div class="form-actions" style="justify-content:flex-start"><button class="btn" type="button" id="resetDemo">Reset demo data</button><button class="btn btn-danger" type="button" id="clearAll">Delete all transactions</button></div></div></section>';
      const keyInput=root.querySelector('#s-gemini-key');
      const toggleBtn=root.querySelector('#toggleKey');
      toggleBtn.addEventListener('click',function(){
        if(keyInput.type==='password'){keyInput.type='text';toggleBtn.textContent='Hide'}
        else{keyInput.type='password';toggleBtn.textContent='Show'}
      });
      root.querySelector('#testKey').addEventListener('click',function(){
        const key=keyInput.value.trim(),model=root.querySelector('#s-gemini-model').value,box=root.querySelector('#testResult');
        if(!key){box.innerHTML='<div class="callout callout-warn">Paste your API key first.</div>';return}
        box.innerHTML='<div class="callout">Testing Gemini…</div>';
        PT.gemini.testConnection(key,model).then(function(r){
          box.innerHTML='<div class="callout callout-info"><strong>✓ Connected</strong> — '+U.esc(r.model)+' replied with “'+U.esc(r.reply)+'”.</div>';
        }).catch(function(err){
          box.innerHTML='<div class="callout callout-danger"><strong>✗ '+U.esc(err.message||'Test failed')+'</strong></div>';
        });
      });
      root.querySelector('#clearKey').addEventListener('click',function(){
        U.confirm({title:'Remove API key?',message:'You will not be able to analyze receipts until you add a new key.',confirmText:'Remove key',danger:true}).then(function(ok){
          if(!ok)return;
          PT.storage.saveApiKey('');U.toast('API key removed.','success');PT.pages.settings.refresh();
        });
      });
      root.querySelector('#saveSettings').addEventListener('click',function(){
        const providers=Array.prototype.slice.call(root.querySelectorAll('[data-provider]')).filter(function(cb){return cb.checked}).map(function(cb){return cb.getAttribute('data-provider')});
        if(!providers.length){U.toast('Select at least one payment provider.','error');return}
        const newKey=keyInput.value.trim(),existingKey=PT.storage.loadApiKey(),keyChanged=newKey!==existingKey;
        if(keyChanged&&newKey&&!root.querySelector('#s-key-ack').checked){U.toast('Tick the security acknowledgment before saving a new key.','error');return}
        if(keyChanged)PT.storage.saveApiKey(newKey);
        PT.store.saveSettings({
          businessName:root.querySelector('#s-biz').value.trim()||'Demo Business',
          owner:root.querySelector('#s-owner').value.trim()||'Staff',
          role:root.querySelector('#s-role').value.trim()||'Cashier',
          email:root.querySelector('#s-email').value.trim(),
          phone:root.querySelector('#s-phone').value.trim(),
          address:root.querySelector('#s-address').value.trim(),
          providers:providers,
          rowsPerPage:Number(root.querySelector('#s-rows').value)||8,
          geminiModel:root.querySelector('#s-gemini-model').value
        });
        U.toast('Settings saved.','success');PT.pages.settings.refresh();
      });
      root.querySelector('#resetSettings').addEventListener('click',function(){
        U.confirm({title:'Restore default settings?',message:'Business info, model and preferences revert to defaults. Your API key is not affected.',confirmText:'Restore defaults'}).then(function(ok){
          if(!ok)return;
          PT.store.saveSettings(PT.data.DEFAULT_SETTINGS);U.toast('Settings restored.','success');PT.pages.settings.refresh();
        });
      });
      root.querySelector('#resetDemo').addEventListener('click',function(){
        U.confirm({title:'Reset demo data?',message:'All current transactions will be replaced with the 15 sample transactions.',detail:'Receipts you scanned will be lost.',confirmText:'Reset demo data',danger:true}).then(function(ok){
          if(!ok)return;
          PT.store.resetDemo();U.toast('Demo data restored.','success');
        });
      });
      root.querySelector('#clearAll').addEventListener('click',function(){
        U.confirm({title:'Delete all transactions?',message:'Every transaction will be permanently deleted.',confirmText:'Delete everything',danger:true}).then(function(ok){
          if(!ok)return;
          PT.store.clearTransactions();U.toast('All transactions deleted.','success');
        });
      });
    },
    refresh:function(){if(this.root&&document.body.contains(this.root))this.render(this.root)}
  };
})(window.PT);
