(function(PT){
  'use strict';
  const U=PT.utils;
  PT.pages=PT.pages||{};
  const state={tab:'Pending Verification',q:'',provider:'All',from:'',to:''};
  const TABS=['Pending Verification','Verified','Unmatched','Rejected'];
  function payBadge(s){
    const m={'Verified':'badge-verified','Pending Verification':'badge-pending','Rejected':'badge-rejected','Unmatched':'badge-unmatched'};
    return '<span class="badge '+(m[s]||'badge-neutral')+'">'+U.esc(s)+'</span>';
  }
  function matches(t){
    if(t.paymentStatus!==state.tab)return false;
    if(state.provider!=='All'&&t.provider!==state.provider)return false;
    if(state.from&&t.date<state.from)return false;
    if(state.to&&t.date>state.to)return false;
    if(state.q){const q=state.q.trim().toLowerCase(),h=(t.id+' '+t.reference+' '+t.sender).toLowerCase();if(h.indexOf(q)===-1)return false}
    return true;
  }
  function actionsFor(t){
    const b=[];
    if(t.paymentStatus!=='Verified')b.push('<button class="btn btn-sm" type="button" data-act="verify" data-id="'+U.esc(t.id)+'">Verify</button>');
    if(t.paymentStatus!=='Unmatched')b.push('<button class="btn btn-sm" type="button" data-act="unmatch" data-id="'+U.esc(t.id)+'">Unmatched</button>');
    if(t.paymentStatus!=='Rejected')b.push('<button class="btn btn-sm" type="button" data-act="reject" data-id="'+U.esc(t.id)+'">Reject</button>');
    b.push('<button class="btn btn-sm btn-ghost" type="button" data-act="view" data-id="'+U.esc(t.id)+'">Details</button>');
    return '<div class="row-actions">'+b.join('')+'</div>';
  }
  function listHtml(list){
    if(!list.length)return '<div class="empty"><strong>Nothing in this queue</strong><p>No transactions match this status and filter combination.</p></div>';
    const rows=list.map(function(t){
      return '<tr><td><button class="link-btn" type="button" data-act="view" data-id="'+U.esc(t.id)+'">'+U.esc(t.id)+'</button></td><td class="nowrap">'+U.esc(U.fmtDate(t.date))+'<div class="sub">'+U.esc(U.fmtTime(t.time))+'</div></td><td><span class="provider-chip">'+U.esc(t.provider)+'</span></td><td class="mono nowrap">'+U.esc(t.reference)+'</td><td>'+U.esc(t.sender)+'</td><td class="num">'+U.peso(t.amount)+'</td><td>'+payBadge(t.paymentStatus)+'</td><td>'+actionsFor(t)+'</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data"><thead><tr><th>ID</th><th>Date</th><th>Provider</th><th>Reference</th><th>Sender</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function setStatus(id,next){
    const t=PT.store.get(id);if(!t)return;
    const run=function(){
      PT.store.update(id,{paymentStatus:next},'Payment status changed to '+next+' during reconciliation');
      U.toast(id+' marked as '+next+'.','success');
      PT.pages.reconciliation.refresh();
    };
    if(next==='Verified'){
      U.confirm({title:'Mark as verified?',message:'Confirm that '+U.peso(t.amount)+' from '+t.sender+' (ref '+t.reference+') has landed in the actual receiving account.',detail:'This prototype cannot read GCash, Maya or bank statements. Verification is a manual human decision.',confirmText:'Yes, mark as verified'}).then(function(ok){if(ok)run()});
    }else if(next==='Rejected'){
      U.confirm({title:'Reject this payment?',message:id+' will be marked as Rejected.',detail:'Use this when the payment never arrived or the receipt is invalid.',confirmText:'Reject payment',danger:true}).then(function(ok){if(ok)run()});
    }else{run()}
  }
  PT.pages.reconciliation={
    title:'Reconciliation',subtitle:'Manually match recorded payments against your accounts',
    render:function(root){
      this.root=root;
      const all=PT.store.all();
      const counts={};TABS.forEach(function(s){counts[s]=0});
      all.forEach(function(t){if(counts[t.paymentStatus]!=null)counts[t.paymentStatus]++});
      const tabsHtml=TABS.map(function(s){return '<button class="tab'+(state.tab===s?' active':'')+'" type="button" data-tab="'+U.esc(s)+'">'+U.esc(s)+'<span class="count">'+counts[s]+'</span></button>'}).join('');
      const providerOpts=['All'].concat(PT.store.getSettings().providers||PT.data.PROVIDERS).map(function(p){return '<option value="'+U.esc(p)+'"'+(state.provider===p?' selected':'')+'>'+(p==='All'?'All providers':U.esc(p))+'</option>'}).join('');
      root.innerHTML='<div class="page-head"><div><h2>Reconciliation</h2><p>Review each payment and confirm it against the actual receiving account.</p></div></div>'+
        '<div class="callout callout-info" style="margin-bottom:16px">This is a frontend simulation. PayTrack PH is <strong>not</strong> connected to GCash, Maya or any bank. Marking as Verified here records your own manual check only.</div>'+
        '<div class="tabs" id="recTabs">'+tabsHtml+'</div>'+
        '<section class="card"><div class="filters" style="grid-template-columns:minmax(180px,1.6fr) minmax(140px,1fr) minmax(130px,1fr) minmax(130px,1fr)"><div class="field"><label>Reference search</label><input class="input" id="rSearch" type="search" placeholder="Reference, sender or ID" value="'+U.esc(state.q)+'"></div><div class="field"><label>Provider</label><select class="input" id="rProvider">'+providerOpts+'</select></div><div class="field"><label>From</label><input class="input" id="rFrom" type="date" value="'+U.esc(state.from)+'"></div><div class="field"><label>To</label><input class="input" id="rTo" type="date" value="'+U.esc(state.to)+'"></div></div><div id="recList"></div></section>';
      const listHost=root.querySelector('#recList');
      const refreshList=function(){listHost.innerHTML=listHtml(all.filter(matches))};
      refreshList();
      root.querySelector('#recTabs').addEventListener('click',function(e){
        const btn=e.target.closest('[data-tab]');if(!btn)return;
        state.tab=btn.getAttribute('data-tab');
        root.querySelectorAll('#recTabs .tab').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-tab')===state.tab)});
        refreshList();
      });
      const searchEl=root.querySelector('#rSearch');
      searchEl.addEventListener('input',U.debounce(function(){state.q=searchEl.value;refreshList()},180));
      root.querySelector('#rProvider').addEventListener('change',function(e){state.provider=e.target.value;refreshList()});
      root.querySelector('#rFrom').addEventListener('change',function(e){state.from=e.target.value;refreshList()});
      root.querySelector('#rTo').addEventListener('change',function(e){state.to=e.target.value;refreshList()});
      listHost.addEventListener('click',function(e){
        const btn=e.target.closest('[data-act]');if(!btn)return;
        const id=btn.getAttribute('data-id'),act=btn.getAttribute('data-act');
        if(act==='view')PT.transactions.openDetails(id);
        else if(act==='verify')setStatus(id,'Verified');
        else if(act==='reject')setStatus(id,'Rejected');
        else if(act==='unmatch')setStatus(id,'Unmatched');
      });
    },
    refresh:function(){if(this.root&&document.body.contains(this.root))this.render(this.root)}
  };
})(window.PT);
