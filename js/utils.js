window.PT = window.PT || {};
(function(PT){
  'use strict';
  const pesoFmt=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2});
  function peso(n){const v=Number(n);return pesoFmt.format(Number.isFinite(v)?v:0)}
  function pesoCompact(n){const v=Number(n)||0,a=Math.abs(v);if(a>=1e6)return '₱'+(v/1e6).toFixed(2).replace(/\.?0+$/,'')+'M';if(a>=1e3)return '₱'+(v/1e3).toFixed(1).replace(/\.0$/,'')+'k';return '₱'+v.toFixed(0)}
  function num(n){return new Intl.NumberFormat('en-PH').format(Number(n)||0)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function isoOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function todayISO(){return isoOf(new Date())}
  function daysAgoISO(n){const d=new Date();d.setDate(d.getDate()-n);return isoOf(d)}
  function parseISO(iso){if(!iso)return null;const p=String(iso).split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1)}
  function fmtDate(iso){const d=parseISO(iso);if(!d||isNaN(d))return '—';return d.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
  function fmtDateShort(iso){const d=parseISO(iso);if(!d||isNaN(d))return '—';return d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
  function weekdayShort(iso){const d=parseISO(iso);if(!d||isNaN(d))return '';return d.toLocaleDateString('en-PH',{weekday:'short'})}
  function fmtTime(t){if(!t)return '—';const p=String(t).split(':').map(Number),h=p[0]||0,m=p[1]||0,ap=h>=12?'PM':'AM',hh=h%12===0?12:h%12;return hh+':'+String(m).padStart(2,'0')+' '+ap}
  function fmtDateTime(ts){const d=new Date(ts);if(isNaN(d))return '—';return d.toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}
  function debounce(fn,ms){let t;return function(){const a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a)},ms||200)}}
  function downscale(dataUrl,maxWidth,quality){
    maxWidth=maxWidth||1000;quality=quality||0.72;
    return new Promise(function(resolve){
      const img=new Image();
      img.onload=function(){
        try{
          const scale=Math.min(1,maxWidth/img.width),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
          const c=document.createElement('canvas');c.width=w;c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          resolve(c.toDataURL('image/jpeg',quality));
        }catch(e){resolve(dataUrl)}
      };
      img.onerror=function(){resolve(dataUrl)};
      img.src=dataUrl;
    });
  }
  function csvCell(v){const s=String(v==null?'':v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
  function downloadCSV(filename,rows){
    const content='\uFEFF'+rows.map(function(r){return r.map(csvCell).join(',')}).join('\r\n');
    const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1500);
  }
  const TICON={success:'✓',error:'!',info:'i'};
  function toast(msg,type){
    const host=document.getElementById('toasts');if(!host)return;
    const kind=TICON[type]?type:'info';
    const el=document.createElement('div');el.className='toast toast-'+kind;
    el.innerHTML='<span class="toast-ico">'+TICON[kind]+'</span><span class="toast-msg">'+esc(msg)+'</span><button class="toast-x" type="button" aria-label="Dismiss">×</button>';
    function dismiss(){el.style.opacity='0';el.style.transition='opacity .18s ease';setTimeout(function(){el.remove()},200)}
    el.querySelector('.toast-x').addEventListener('click',dismiss);
    host.appendChild(el);setTimeout(dismiss,4200);
  }
  function openModal(opts){
    opts=opts||{};
    const root=document.getElementById('modalRoot');
    const bd=document.createElement('div');bd.className='modal-backdrop';
    bd.innerHTML='<div class="modal '+(opts.wide?'modal-wide ':'')+(opts.narrow?'modal-narrow':'')+'" role="dialog" aria-modal="true">'+
      '<div class="modal-head"><h3>'+esc(opts.title||'')+'</h3><button class="icon-btn modal-x" type="button" aria-label="Close">×</button></div>'+
      '<div class="modal-body">'+(opts.body||'')+'</div>'+
      (opts.footer?'<div class="modal-foot">'+opts.footer+'</div>':'')+'</div>';
    root.appendChild(bd);document.body.classList.add('modal-open');
    let closed=false;
    function close(){if(closed)return;closed=true;bd.remove();if(!root.children.length)document.body.classList.remove('modal-open');document.removeEventListener('keydown',onKey);if(typeof opts.onClose==='function')opts.onClose()}
    function onKey(e){if(e.key==='Escape')close()}
    bd.querySelector('.modal-x').addEventListener('click',close);
    bd.addEventListener('mousedown',function(e){if(e.target===bd)close()});
    document.addEventListener('keydown',onKey);
    if(typeof opts.onMount==='function')opts.onMount(bd.querySelector('.modal'),close);
    return{root:bd,close:close};
  }
  function confirmDialog(opts){
    opts=opts||{};
    return new Promise(function(resolve){
      openModal({
        title:opts.title||'Are you sure?',narrow:true,
        body:'<p class="modal-text">'+esc(opts.message||'')+'</p>'+(opts.detail?'<div class="callout '+(opts.tone||'')+'" style="margin-top:12px">'+esc(opts.detail)+'</div>':''),
        footer:'<button class="btn" data-act="cancel" type="button">'+esc(opts.cancelText||'Cancel')+'</button><button class="btn '+(opts.danger?'btn-danger':'btn-primary')+'" data-act="ok" type="button">'+esc(opts.confirmText||'Confirm')+'</button>',
        onClose:function(){resolve(false)},
        onMount:function(modal,close){
          modal.querySelector('[data-act="cancel"]').addEventListener('click',function(){resolve(false);close()});
          modal.querySelector('[data-act="ok"]').addEventListener('click',function(){resolve(true);close()});
        }
      });
    });
  }
  function barChart(items){
    const max=Math.max(1,items.reduce(function(m,i){return Math.max(m,Number(i.value)||0)},0));
    if(!items.length)return '<div class="empty"><p>No data.</p></div>';
    return '<div class="bar-chart">'+items.map(function(i){
      const v=Number(i.value)||0,pct=Math.round((v/max)*100);
      return '<div class="bar-col" title="'+esc(i.title||i.label)+'"><span class="bar-value">'+esc(i.display!=null?i.display:'')+'</span><div class="bar-track"><div class="bar-fill'+(v===0?' is-empty':'')+'" style="height:'+(v===0?2:Math.max(pct,4))+'%"></div></div><span class="bar-label">'+esc(i.label)+'</span></div>';
    }).join('')+'</div>';
  }
  function donutChart(segments,centerValue,centerLabel){
    const total=segments.reduce(function(s,x){return s+(Number(x.value)||0)},0);
    const r=52,C=2*Math.PI*r;let offset=0;
    const arcs=segments.map(function(seg){
      const v=Number(seg.value)||0,len=total?(v/total)*C:0;
      const html='<circle cx="66" cy="66" r="'+r+'" fill="none" stroke="'+seg.color+'" stroke-width="15" stroke-dasharray="'+len+' '+(C-len)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 66 66)"></circle>';
      offset+=len;return html;
    }).join('');
    const legend=segments.map(function(seg){
      return '<div class="legend-item"><span class="legend-swatch" style="background:'+seg.color+'"></span><span class="lbl">'+esc(seg.label)+'</span><span class="val">'+esc(String(seg.value))+'</span></div>';
    }).join('');
    return '<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="'+r+'" fill="none" stroke="#eef1f6" stroke-width="15"></circle>'+(total?arcs:'')+'</svg><div class="donut-center"><strong>'+esc(String(centerValue))+'</strong><small>'+esc(centerLabel)+'</small></div></div><div class="legend">'+legend+'</div></div>';
  }
  PT.utils={peso,pesoCompact,num,esc,isoOf,todayISO,daysAgoISO,parseISO,fmtDate,fmtDateShort,weekdayShort,fmtTime,fmtDateTime,debounce,downscale,downloadCSV,toast,openModal,confirm:confirmDialog,barChart,donutChart};
})(window.PT);
