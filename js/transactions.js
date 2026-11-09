(function(PT){
  'use strict';
  const U=PT.utils;
  PT.pages=PT.pages||{};
  const state={q:'',provider:'All',status:'All',from:'',to:'',sort:'date-desc',limit:8};
  function payBadge(s){
    const m={'Verified':'badge-verified','Pending Verification':'badge-pending','Rejected':'badge-rejected','Unmatched':'badge-unmatched'};
    return '<span class="badge '+(m[s]||'badge-neutral')+'">'+U.esc(s)+'</span>';
  }
  function extBadge(s){
    const m={'Successfully Extracted':'badge-ok','Incomplete':'badge-warn','Needs Review':'badge-unmatched'};
    return '<span class="badge '+(m[s]||'badge-neutral')+'">'+U.esc(s)+'</span>';
  }
  function filtered(){
    const q=state.q.trim().toLowerCase();
    let list=PT.store.all().filter(function(t){
      if(q){const h=(t.id+' '+t.reference+' '+t.sender+' '+t.provider).toLowerCase();if(h.indexOf(q)===-1)return false}
      if(state.provider!=='All'&&t.provider!==state.provider)return false;
      if(state.status!=='All'&&t.paymentStatus!==state.status)return false;
      if(state.from&&t.date<state.from)return false;
      if(state.to&&t.date>state.to)return false;
      return true;
    });
    list.sort(function(a,b){
      switch(state.sort){
        case 'date-asc':return((a.date||'')+(a.time||'')).localeCompare((b.date||'')+(b.time||''));
        case 'amount-desc':return (Number(b.amount)||0)-(Number(a.amount)||0);
        case 'amount-asc':return (Number(a.amount)||0)-(Number(b.amount)||0);
        default:return((b.date||'')+(b.time||'')).localeCompare((a.date||'')+(a.time||''));
      }
    });
    return list;
  }
  function rowHtml(t){
    return '<tr><td><button class="link-btn" type="button" data-act="view" data-id="'+U.esc(t.id)+'">'+U.esc(t.id)+'</button></td><td class="nowrap">'+U.esc(U.fmtDate(t.date))+'<div class="sub">'+U.esc(U.fmtTime(t.time))+'</div></td><td><span class="provider-chip">'+U.esc(t.provider)+'</span></td><td class="mono nowrap">'+U.esc(t.reference)+'</td><td>'+U.esc(t.sender)+'</td><td class="num">'+U.peso(t.amount)+'</td><td>'+extBadge(t.extractionStatus)+'</td><td>'+payBadge(t.paymentStatus)+'</td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" type="button" data-act="view" data-id="'+U.esc(t.id)+'">View</button><button class="btn btn-sm btn-ghost" type="button" data-act="edit" data-id="'+U.esc(t.id)+'">Edit</button><button class="btn btn-sm btn-ghost danger" type="button" data-act="del" data-id="'+U.esc(t.id)+'">Delete</button></div></td></tr>';
  }
  function tableHtml(list){
    const visible=list.slice(0,state.limit);
    if(!list.length)return '<div class="empty"><strong>No transactions match your filters</strong><p>Try clearing the search or scan a new receipt.</p><button class="btn btn-primary" type="button" data-go="scan">Scan receipt</button></div>';
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Transaction ID</th><th>Date</th><th>Provider</th><th>Reference No.</th><th>Sender</th><th class="num">Amount</th><th>Extraction</th><th>Payment</th><th></th></tr></thead><tbody>'+visible.map(rowHtml).join('')+'</tbody></table></div>';
  }
  function footHtml(list){
    const shown=Math.min(state.limit,list.length),more=list.length>shown;
    return '<div class="table-foot"><span>Showing '+shown+' of '+list.length+'</span>'+(more?'<button class="btn btn-sm" type="button" id="loadMore">Load more</button>':'<span></span>')+'</div>';
  }
  function renderTable(container){
    const list=filtered();
    container.innerHTML=tableHtml(list)+(list.length?footHtml(list):'');
    const more=container.querySelector('#loadMore');
    if(more)more.addEventListener('click',function(){state.limit+=8;renderTable(container)});
  }
  function exportCsv(list){
    if(!list.length){U.toast('Nothing to export.','error');return}
    const rows=[['ID','Date','Time','Provider','Reference','Sender','Recipient','Amount','Extraction','Payment','Recorded By','Recorded At']];
    list.forEach(function(t){rows.push([t.id,t.date,t.time,t.provider,t.reference,t.sender,t.recipient,(Number(t.amount)||0).toFixed(2),t.extractionStatus,t.paymentStatus,t.recordedBy||'',U.fmtDateTime(t.createdAt)])});
    U.downloadCSV('paytrack-'+U.todayISO()+'.csv',rows);
    U.toast('Exported '+list.length+' transaction(s).','success');
  }
  function openDetails(id){
    const t=PT.store.get(id);if(!t){U.toast('Not found.','error');return}
    const image=t.receiptImage?'<div class="receipt-frame"><img src="'+U.esc(t.receiptImage)+'" alt="Receipt"></div>':'<div class="receipt-frame"><div class="empty"><p>No image.</p></div></div>';
    const log=(t.log||[]).slice().reverse().map(function(l){return '<div class="log-item"><span class="log-dot"></span><div><p>'+U.esc(l.action)+'</p><small>'+U.esc(U.fmtDateTime(l.ts))+' · '+U.esc(l.by||'Staff')+'</small></div></div>'}).join('')||'<p class="small muted">No activity.</p>';
    const statusOpts=PT.data.PAYMENT_STATUSES.map(function(s){return '<option value="'+U.esc(s)+'"'+(t.paymentStatus===s?' selected':'')+'>'+U.esc(s)+'</option>'}).join('');
    U.openModal({
      title:'Transaction '+t.id,wide:true,
      body:'<div class="detail-grid"><div class="detail-media">'+image+'</div><div><div class="detail-title"><h4>'+U.esc(t.id)+'</h4>'+payBadge(t.paymentStatus)+extBadge(t.extractionStatus)+'</div><p class="small muted">Recorded '+U.esc(U.fmtDateTime(t.createdAt))+' by '+U.esc(t.recordedBy||'Staff')+'</p><dl class="dl-grid"><div><dt>Provider</dt><dd>'+U.esc(t.provider)+'</dd></div><div><dt>Reference</dt><dd class="mono">'+U.esc(t.reference)+'</dd></div><div><dt>Amount</dt><dd><strong>'+U.peso(t.amount)+'</strong></dd></div><div><dt>Date &amp; time</dt><dd>'+U.esc(U.fmtDate(t.date))+' · '+U.esc(U.fmtTime(t.time))+'</dd></div><div><dt>Sender</dt><dd>'+U.esc(t.sender)+'</dd></div><div><dt>Recipient</dt><dd>'+U.esc(t.recipient)+'</dd></div><div><dt>Displayed</dt><dd>'+U.esc(t.displayedStatus||'—')+'</dd></div><div><dt>Extraction</dt><dd>'+U.esc(t.extractionStatus)+'</dd></div></dl><div class="status-changer"><div class="field"><label>Payment status</label><select class="input" id="detailStatus">'+statusOpts+'</select></div><button class="btn btn-primary" type="button" id="applyStatus">Update status</button></div><div class="divider"></div><h4 style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:10px">Activity log</h4><div class="log-list">'+log+'</div></div></div>',
      footer:'<button class="btn btn-ghost" type="button" id="dEdit">Edit details</button><button class="btn btn-danger" type="button" id="dDelete">Delete</button><button class="btn" type="button" id="dClose">Close</button>',
      onMount:function(modal,close){
        modal.querySelector('#dClose').addEventListener('click',close);
        modal.querySelector('#applyStatus').addEventListener('click',function(){
          const next=modal.querySelector('#detailStatus').value;
          if(next===t.paymentStatus){U.toast('Already applied.','info');return}
          if(next==='Verified'){
            U.confirm({title:'Mark as verified?',message:'You are about to mark '+t.id+' as Verified.',detail:'Only do this after confirming the payment appears in the actual GCash / Maya / bank account.',confirmText:'Yes, mark as verified'}).then(function(ok){
              if(!ok)return;
              PT.store.update(t.id,{paymentStatus:'Verified'},'Payment status changed to Verified');
              U.toast(t.id+' marked as Verified.','success');close();
              if(PT.pages.transactions.refresh)PT.pages.transactions.refresh();
            });
          }else{
            PT.store.update(t.id,{paymentStatus:next},'Payment status changed to '+next);
            U.toast(t.id+' status updated.','success');close();
            if(PT.pages.transactions.refresh)PT.pages.transactions.refresh();
          }
        });
        modal.querySelector('#dEdit').addEventListener('click',function(){close();openEdit(t.id)});
        modal.querySelector('#dDelete').addEventListener('click',function(){close();confirmDelete(t.id)});
      }
    });
  }
  function openEdit(id){
    const t=PT.store.get(id);if(!t)return;
    const providerOpts=(PT.store.getSettings().providers||PT.data.PROVIDERS).map(function(p){return '<option value="'+U.esc(p)+'"'+(t.provider===p?' selected':'')+'>'+U.esc(p)+'</option>'}).join('');
    const statusOpts=PT.data.PAYMENT_STATUSES.map(function(s){return '<option value="'+U.esc(s)+'"'+(t.paymentStatus===s?' selected':'')+'>'+U.esc(s)+'</option>'}).join('');
    U.openModal({
      title:'Edit '+t.id,
      body:'<form id="editForm" novalidate><div class="form-grid"><div class="field"><label>Provider</label><select class="input" id="e-provider">'+providerOpts+'</select></div><div class="field"><label>Reference</label><input class="input mono" id="e-reference" type="text" value="'+U.esc(t.reference)+'"></div><div class="field"><label>Amount</label><input class="input" id="e-amount" type="number" step="0.01" min="0" value="'+U.esc(t.amount)+'"></div><div class="field"><label>Payment status</label><select class="input" id="e-status">'+statusOpts+'</select></div><div class="field"><label>Date</label><input class="input" id="e-date" type="date" value="'+U.esc(t.date)+'"></div><div class="field"><label>Time</label><input class="input" id="e-time" type="time" value="'+U.esc(t.time)+'"></div><div class="field"><label>Sender</label><input class="input" id="e-sender" type="text" value="'+U.esc(t.sender)+'"></div><div class="field"><label>Recipient</label><input class="input" id="e-recipient" type="text" value="'+U.esc(t.recipient)+'"></div></div><div id="editError"></div></form>',
      footer:'<button class="btn" type="button" id="eCancel">Cancel</button><button class="btn btn-primary" type="button" id="eSave">Save changes</button>',
      onMount:function(modal,close){
        modal.querySelector('#eCancel').addEventListener('click',close);
        modal.querySelector('#eSave').addEventListener('click',function(){
          const val=function(id){return modal.querySelector('#'+id).value};
          const amount=Number(val('e-amount')),reference=val('e-reference').trim(),errors=[];
          if(!reference)errors.push('Reference is required.');
          if(!val('e-date'))errors.push('Date is required.');
          if(!val('e-sender').trim())errors.push('Sender is required.');
          if(isNaN(amount)||amount<=0)errors.push('Amount must be > 0.');
          const dup=reference?PT.store.findByReference(reference,t.id):null;
          if(dup)errors.push('Reference '+reference+' already exists on '+dup.id+'.');
          if(errors.length){modal.querySelector('#editError').innerHTML='<div class="callout callout-danger">'+errors.map(U.esc).join('<br>')+'</div>';return}
          const nextStatus=val('e-status'),statusChanged=nextStatus!==t.paymentStatus;
          const apply=function(){
            PT.store.update(t.id,{provider:val('e-provider'),reference,amount:Math.round(amount*100)/100,date:val('e-date'),time:val('e-time'),sender:val('e-sender').trim(),recipient:val('e-recipient').trim(),paymentStatus:nextStatus},statusChanged?'Payment status changed to '+nextStatus:'Transaction edited');
            U.toast(t.id+' updated.','success');close();
            if(PT.pages.transactions.refresh)PT.pages.transactions.refresh();
          };
          if(nextStatus==='Verified'&&statusChanged){
            U.confirm({title:'Mark as verified?',message:'This will be marked Verified.',detail:'Confirm the payment appears in the actual receiving account first.',confirmText:'Mark as verified'}).then(function(ok){if(ok)apply()});
          }else{apply()}
        });
      }
    });
  }
  function confirmDelete(id){
    const t=PT.store.get(id);if(!t)return;
    U.confirm({title:'Delete transaction?',message:'Transaction '+t.id+' ('+U.peso(t.amount)+' via '+t.provider+') will be permanently removed.',confirmText:'Delete transaction',danger:true}).then(function(ok){
      if(!ok)return;
      PT.store.remove(id);U.toast(t.id+' deleted.','success');
      if(PT.pages.transactions.refresh)PT.pages.transactions.refresh();
    });
  }
  PT.pages.transactions={
    title:'Transactions',subtitle:'Search, review and manage recorded payments',
    render:function(root){
      this.root=root;
      const providerOpts=['All'].concat(PT.store.getSettings().providers||PT.data.PROVIDERS).map(function(p){return '<option value="'+U.esc(p)+'"'+(state.provider===p?' selected':'')+'>'+(p==='All'?'All providers':U.esc(p))+'</option>'}).join('');
      const statusOpts=['All'].concat(PT.data.PAYMENT_STATUSES).map(function(s){return '<option value="'+U.esc(s)+'"'+(state.status===s?' selected':'')+'>'+(s==='All'?'All statuses':U.esc(s))+'</option>'}).join('');
      const sortOpts=[['date-desc','Newest first'],['date-asc','Oldest first'],['amount-desc','Amount high to low'],['amount-asc','Amount low to high']].map(function(o){return '<option value="'+o[0]+'"'+(state.sort===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('');
      root.innerHTML='<div class="page-head"><div><h2>Transactions</h2><p>Every receipt captured by your team, stored in this browser.</p></div><div class="page-head-actions"><button class="btn" type="button" id="exportBtn">Export CSV</button><button class="btn btn-primary" type="button" data-go="scan">+ Scan receipt</button></div></div><section class="card"><div class="filters"><div class="field"><label>Search</label><input class="input" id="fSearch" type="search" placeholder="ID, reference or sender" value="'+U.esc(state.q)+'"></div><div class="field"><label>Provider</label><select class="input" id="fProvider">'+providerOpts+'</select></div><div class="field"><label>Status</label><select class="input" id="fStatus">'+statusOpts+'</select></div><div class="field"><label>From</label><input class="input" id="fFrom" type="date" value="'+U.esc(state.from)+'"></div><div class="field"><label>To</label><input class="input" id="fTo" type="date" value="'+U.esc(state.to)+'"></div><div class="field"><label>Sort</label><select class="input" id="fSort">'+sortOpts+'</select></div></div><div id="txTable"></div></section>';
      const tableHost=root.querySelector('#txTable');
      renderTable(tableHost);
      const search=root.querySelector('#fSearch');
      search.addEventListener('input',U.debounce(function(){state.q=search.value;state.limit=8;renderTable(tableHost)},180));
      root.querySelector('#fProvider').addEventListener('change',function(e){state.provider=e.target.value;state.limit=8;renderTable(tableHost)});
      root.querySelector('#fStatus').addEventListener('change',function(e){state.status=e.target.value;state.limit=8;renderTable(tableHost)});
      root.querySelector('#fFrom').addEventListener('change',function(e){state.from=e.target.value;state.limit=8;renderTable(tableHost)});
      root.querySelector('#fTo').addEventListener('change',function(e){state.to=e.target.value;state.limit=8;renderTable(tableHost)});
      root.querySelector('#fSort').addEventListener('change',function(e){state.sort=e.target.value;renderTable(tableHost)});
      root.querySelector('#exportBtn').addEventListener('click',function(){exportCsv(filtered())});
      tableHost.addEventListener('click',function(e){
        const btn=e.target.closest('[data-act]');if(!btn)return;
        const id=btn.getAttribute('data-id'),act=btn.getAttribute('data-act');
        if(act==='view')openDetails(id);else if(act==='edit')openEdit(id);else if(act==='del')confirmDelete(id);
      });
    },
    refresh:function(){if(this.root&&document.body.contains(this.root))this.render(this.root)},
    openDetails
  };
})(window.PT);
