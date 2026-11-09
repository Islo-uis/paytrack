(function(PT){
  'use strict';
  const U=PT.utils;
  const state={page:'dashboard'};
  function currentHashPage(){
    const raw=(location.hash||'').replace('#','');
    return PT.pages[raw]?raw:'dashboard';
  }
  function renderPage(){
    const key=currentHashPage(),page=PT.pages[key],root=document.getElementById('view');
    if(state.page&&PT.pages[state.page]&&typeof PT.pages[state.page].unmount==='function')PT.pages[state.page].unmount();
    state.page=key;
    root.innerHTML='';
    const wrap=document.createElement('div');
    root.appendChild(wrap);
    page.render(wrap);
    document.getElementById('pageTitle').textContent=page.title||'';
    document.getElementById('pageSub').textContent=page.subtitle||'';
    document.querySelectorAll('#nav .nav-item').forEach(function(btn){btn.classList.toggle('active',btn.getAttribute('data-page')===key)});
    closeSidebar();
    window.scrollTo(0,0);
    refreshChrome();
  }
  function go(page){
    if(!PT.pages[page])page='dashboard';
    if(location.hash==='#'+page)renderPage();else location.hash='#'+page;
  }
  function initials(name){
    return String(name||'Staff').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0].toUpperCase()}).join('')||'ST';
  }
  function refreshChrome(){
    const s=PT.store.getSettings();
    document.getElementById('bizLabel').textContent=s.businessName||'Demo Business';
    document.getElementById('pName').textContent=s.owner||'Staff';
    document.getElementById('pRole').textContent=s.role||'Cashier';
    document.getElementById('avatar').textContent=initials(s.owner);
    const pending=PT.store.pendingCount();
    document.getElementById('notifDot').hidden=pending===0;
  }
  function closeSidebar(){
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('backdrop').hidden=true;
  }
  function openSidebar(){
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('backdrop').hidden=false;
  }
  function bind(){
    document.getElementById('nav').addEventListener('click',function(e){
      const btn=e.target.closest('[data-page]');
      if(btn)go(btn.getAttribute('data-page'));
    });
    document.getElementById('menuBtn').addEventListener('click',function(){
      document.getElementById('sidebar').classList.contains('open')?closeSidebar():openSidebar();
    });
    document.getElementById('backdrop').addEventListener('click',closeSidebar);
    document.getElementById('notifBtn').addEventListener('click',function(){
      const p=PT.store.pendingCount();
      if(p){go('reconciliation')}
      else U.toast('No pending notifications.','info');
    });
    document.getElementById('profileBtn').addEventListener('click',function(){go('settings')});
    document.addEventListener('click',function(e){
      const btn=e.target.closest('[data-go]');
      if(btn){e.preventDefault();go(btn.getAttribute('data-go'))}
    });
    window.addEventListener('hashchange',renderPage);
    PT.store.subscribe(function(){if(PT.pages[state.page]&&typeof PT.pages[state.page].refresh==='function')PT.pages[state.page].refresh()});
  }
  function init(){
    PT.store.init();
    bind();
    if(!location.hash)history.replaceState(null,'','#dashboard');
    renderPage();
  }
  PT.app={go,renderPage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})(window.PT);
