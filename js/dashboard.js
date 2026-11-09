(function(PT){
  'use strict';
  const U=PT.utils;
  PT.pages=PT.pages||{};
  const SC={'Verified':'#0f7a55','Pending Verification':'#c47b0a','Rejected':'#b42318','Unmatched':'#8894a8'};
  function badge(s){
    const m={'Verified':'badge-verified','Pending Verification':'badge-pending','Rejected':'badge-rejected','Unmatched':'badge-unmatched'};
    return '<span class="badge '+(m[s]||'badge-neutral')+'">'+U.esc(s)+'</span>';
  }
  function dailyItems(txs){
    const items=[];
    for(let i=6;i>=0;i--){
      const iso=U.daysAgoISO(i);
      const total=txs.reduce(function(s,t){if(t.date!==iso||t.paymentStatus==='Rejected')return s;return s+(Number(t.amount)||0)},0);
      items.push({label:i===0?'Today':U.weekdayShort(iso),value:total,display:total?U.pesoCompact(total):'',title:U.fmtDate(iso)+': '+U.peso(total)});
    }
    return items;
  }
  function providerBreakdown(txs){
    const mp=U.todayISO().slice(0,7),ps=PT.store.getSettings().providers||PT.data.PROVIDERS,totals={};
    ps.forEach(function(p){totals[p]=0});
    txs.forEach(function(t){if(String(t.date).slice(0,7)!==mp)return;if(t.paymentStatus==='Rejected')return;totals[t.provider]=(totals[t.provider]||0)+(Number(t.amount)||0)});
    const list=Object.keys(totals).map(function(p){return{provider:p,total:totals[p]}}).sort(function(a,b){return b.total-a.total});
    const grand=list.reduce(function(s,x){return s+x.total},0);
    const max=Math.max(1,list.reduce(function(m,x){return Math.max(m,x.total)},0));
    if(!grand)return '<div class="empty"><p>No collections recorded this month yet.</p></div>';
    return list.map(function(r){
      const pct=Math.round((r.total/max)*100),share=grand?Math.round((r.total/grand)*100):0;
      return '<div class="provider-row"><div class="provider-row-head"><strong>'+U.esc(r.provider)+'</strong><span>'+U.peso(r.total)+' · '+share+'%</span></div><div class="provider-bar"><i style="width:'+(r.total?Math.max(pct,3):0)+'%"></i></div></div>';
    }).join('');
  }
  function statusDonut(txs){
    const c={'Verified':0,'Pending Verification':0,'Rejected':0,'Unmatched':0};
    txs.forEach(function(t){if(c[t.paymentStatus]!=null)c[t.paymentStatus]++});
    return U.donutChart(Object.keys(c).map(function(k){return{label:k,value:c[k],color:SC[k]}}),txs.length,'Transactions');
  }
  function recentTable(txs){
    const recent=txs.slice().sort(function(a,b){return((b.date||'')+(b.time||'')).localeCompare((a.date||'')+(a.time||''))}).slice(0,5);
    if(!recent.length)return '<div class="empty"><strong>No transactions yet</strong><p>Scan your first receipt to see it here.</p><button class="btn btn-primary" type="button" data-go="scan">Scan receipt</button></div>';
    const rows=recent.map(function(t){
      return '<tr><td><button class="link-btn" type="button" data-tx="'+U.esc(t.id)+'">'+U.esc(t.id)+'</button></td><td class="nowrap">'+U.esc(U.fmtDateShort(t.date))+'<div class="sub">'+U.esc(U.fmtTime(t.time))+'</div></td><td><span class="provider-chip">'+U.esc(t.provider)+'</span></td><td class="num">'+U.peso(t.amount)+'</td><td>'+badge(t.paymentStatus)+'</td></tr>';
    }).join('');
    return '<table class="data"><thead><tr><th>ID</th><th>Date</th><th>Provider</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function stat(label,value,foot,tone){
    return '<div class="stat"><div class="stat-label">'+U.esc(label)+'</div><div class="stat-value">'+U.esc(value)+'</div><div class="stat-foot '+(tone||'')+'">'+U.esc(foot)+'</div></div>';
  }
  function exportCsv(txs){
    const rows=[['ID','Date','Time','Provider','Reference','Sender','Recipient','Amount','Extraction','Payment','Recorded By']];
    txs.forEach(function(t){rows.push([t.id,t.date,t.time,t.provider,t.reference,t.sender,t.recipient,(Number(t.amount)||0).toFixed(2),t.extractionStatus,t.paymentStatus,t.recordedBy||''])});
    U.downloadCSV('paytrack-'+U.todayISO()+'.csv',rows);
    U.toast('Exported '+txs.length+' transaction(s).','success');
  }
  PT.pages.dashboard={
    title:'Dashboard',subtitle:'Overview of your collections',
    render:function(root){
      this.root=root;
      const txs=PT.store.all(),today=U.todayISO(),mp=today.slice(0,7);
      let todayTotal=0,monthTotal=0;
      txs.forEach(function(t){if(t.paymentStatus==='Rejected')return;const a=Number(t.amount)||0;if(t.date===today)todayTotal+=a;if(String(t.date).slice(0,7)===mp)monthTotal+=a});
      const pending=PT.store.pendingCount();
      root.innerHTML=
        '<div class="page-head"><div><h2>Financial overview</h2><p>All figures computed live from stored transactions · '+U.esc(new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'}))+'</p></div><div class="page-head-actions"><button class="btn" type="button" id="dashExport">Export CSV</button><button class="btn btn-primary" type="button" data-go="scan">+ Scan receipt</button></div></div>'+
        '<div class="stat-grid">'+
          stat('Total payments today',U.peso(todayTotal),txs.filter(function(t){return t.date===today}).length+' recorded today','')+
          stat('Total collection this month',U.peso(monthTotal),'Excludes rejected payments','up')+
          stat('Total transactions',U.num(txs.length),'All records in this browser','')+
          stat('Pending verification',U.num(pending),pending?'Needs review in Reconciliation':'Everything reviewed',pending?'warn':'up')+
        '</div>'+
        '<div class="grid-charts"><section class="card"><div class="card-head"><h3>Daily collection</h3><span class="chip">Last 7 days</span></div><div class="card-body">'+U.barChart(dailyItems(txs))+'</div></section>'+
        '<section class="card"><div class="card-head"><h3>Payment status</h3></div><div class="card-body">'+statusDonut(txs)+'</div></section></div>'+
        '<div class="grid-2"><section class="card"><div class="card-head"><h3>Payment provider breakdown</h3><span class="chip">This month</span></div><div class="card-body">'+providerBreakdown(txs)+'</div></section>'+
        '<section class="card"><div class="card-head"><h3>Recent transactions</h3><button class="btn btn-sm btn-ghost" type="button" data-go="transactions">View all</button></div><div class="table-wrap">'+recentTable(txs)+'</div></section></div>';
      root.querySelector('#dashExport').addEventListener('click',function(){exportCsv(txs)});
      root.addEventListener('click',function(e){const b=e.target.closest('[data-tx]');if(b)PT.transactions.openDetails(b.getAttribute('data-tx'))});
    },
    refresh:function(){if(this.root&&document.body.contains(this.root))this.render(this.root)}
  };
})(window.PT);
