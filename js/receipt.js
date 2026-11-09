(function(PT){
  'use strict';
  const U=PT.utils;
  PT.pages=PT.pages||{};
  const SAMPLES=[
    {provider:'GCash',sender:'Juan Dela Cruz',amount:1250,displayed:'Successful'},
    {provider:'Maya',sender:'Maria Clara Santos',amount:3480.5,displayed:'Successful'},
    {provider:'BPI',sender:'Roberto Tan',amount:15800,displayed:'Successful'},
    {provider:'BDO',sender:'Alicia Gomez',amount:6250,displayed:'Successful'},
    {provider:'UnionBank',sender:'Rafael Villanueva',amount:2200,displayed:'Successful'}
  ];
  const REFP={'GCash':'GC','Maya':'MY','BPI':'BPI','BDO':'BDO','UnionBank':'UB','Other Banks':'SEC'};
  const state={phase:'capture',image:null,form:null,errors:{},meta:null,isSample:false,sampleTemplate:null};
  let videoEl=null,cameraError='',procGen=0;
  function randomRef(p){return (REFP[p]||'REF')+'-'+Math.floor(1000000+Math.random()*8999999)}
  function nowTime(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  function emptyForm(){return{provider:'',reference:'',amount:'',date:U.todayISO(),time:nowTime(),sender:'',recipient:PT.store.getSettings().businessName||'Demo Business',displayedStatus:'Successful'}}
  function formFrom(fields){
    const today=U.todayISO();
    return{
      provider:fields.provider||'',
      reference:fields.reference||'',
      amount:Number(fields.amount)>0?Number(fields.amount).toFixed(2):'',
      date:/^\d{4}-\d{2}-\d{2}$/.test(fields.date||'')?fields.date:today,
      time:/^\d{2}:\d{2}$/.test(fields.time||'')?fields.time:nowTime(),
      sender:fields.sender||'',
      recipient:fields.recipient||(PT.store.getSettings().businessName||'Demo Business'),
      displayedStatus:PT.data.DISPLAYED_STATUSES.indexOf(fields.displayedStatus)>-1?fields.displayedStatus:'Successful'
    };
  }
  function extractionStatus(f){
    const c=[!!f.provider,!!f.reference,Number(f.amount)>0,!!f.sender,!!f.date].filter(Boolean).length;
    if(c===5)return 'Successfully Extracted';if(c>=2)return 'Incomplete';return 'Needs Review';
  }
  function validate(f){
    const e={};
    if(!f.provider)e.provider='Select a payment provider.';
    if(!String(f.reference||'').trim())e.reference='Reference number is required.';
    else if(PT.store.findByReference(f.reference))e.reference='This reference number already exists.';
    const a=Number(f.amount);
    if(!String(f.amount).trim()||isNaN(a)||a<=0)e.amount='Amount must be greater than zero.';
    if(!f.date)e.date='Transaction date is required.';
    if(!String(f.sender||'').trim())e.sender='Sender name is required.';
    if(!String(f.recipient||'').trim())e.recipient='Recipient name is required.';
    return e;
  }
  function head(){
    return '<div class="page-head"><div><h2>Scan receipt</h2><p>Upload or photograph a receipt — Google Gemini Vision extracts the details.</p></div><div class="page-head-actions"><button class="btn" type="button" data-go="transactions">View transactions</button></div></div>';
  }
  function notConfigBanner(){
    if(PT.gemini.isConfigured())return '';
    return '<div class="callout callout-warn" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><strong>Gemini API key not configured.</strong> Add it in Settings, or use “Use sample receipt” to test the save flow.</div><button class="btn btn-primary btn-sm" type="button" data-go="settings">Configure in Settings</button></div>';
  }
  function render(root){
    if(state.phase==='capture')renderCapture(root);
    else if(state.phase==='processing')renderProcessing(root);
    else renderReview(root);
  }
  function renderCapture(root){
    root.innerHTML=head()+notConfigBanner()+
      '<div class="scan-grid"><section class="card"><div class="card-head"><h3>Receipt image</h3><span class="chip">Step 1 of 3</span></div><div class="card-body">'+
      '<div class="camera-stage" id="cameraStage"><video id="cameraVideo" playsinline webkit-playsinline muted autoplay hidden></video><img id="shotPreview" alt="Preview" hidden>'+
      '<div class="camera-empty" id="cameraEmpty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><strong>No image yet</strong><small>Open camera, upload a photo, or use a sample.</small></div></div>'+
      '<div class="capture-actions"><button class="btn btn-primary" type="button" id="openCameraBtn">Open camera</button><button class="btn" type="button" id="captureBtn" disabled>Capture photo</button><label class="btn" for="fileInput">Upload receipt</label><input type="file" id="fileInput" accept="image/*" hidden><button class="btn btn-ghost" type="button" id="retakeBtn" hidden>Retake</button><button class="btn btn-ghost" type="button" id="sampleBtn">Use sample</button></div>'+
      '<div id="cameraHint" class="scan-note">Camera needs <strong>HTTPS</strong> or <strong>localhost</strong>. Image is sent to Google Gemini for extraction.</div>'+
      '</div></section>'+
      '<section class="card"><div class="card-head"><h3>How this works</h3></div><div class="card-body"><div class="callout callout-info" style="margin-bottom:14px">Gemini Vision reads the receipt and returns structured JSON. You always review before saving.</div><ol style="margin:0;padding-left:18px;font-size:13px;color:var(--text2);line-height:1.9"><li>Capture or upload the receipt.</li><li>Gemini extracts provider, reference, amount, date, sender, status.</li><li>Check each field.</li><li>Save — new records start as <strong>Pending Verification</strong>.</li></ol></div></section></div>';
    videoEl=root.querySelector('#cameraVideo');
    root.querySelector('#openCameraBtn').addEventListener('click',function(){openCamera(root)});
    root.querySelector('#captureBtn').addEventListener('click',function(){takeShot(root)});
    root.querySelector('#retakeBtn').addEventListener('click',function(){resetCapture(root)});
    root.querySelector('#sampleBtn').addEventListener('click',function(){useSample(root)});
    root.querySelector('#fileInput').addEventListener('change',function(e){handleFile(e.target.files&&e.target.files[0],root);e.target.value=''});
    if(cameraError)root.querySelector('#cameraHint').innerHTML='<span style="color:var(--amber)">'+U.esc(cameraError)+'</span>';
  }
  function renderProcessing(root){
    root.innerHTML=head()+'<div class="card"><div class="card-body"><div class="processing"><div class="spinner"></div><strong id="procLabel">Sending image to Gemini…</strong><p id="procSub">Extraction usually takes 2–5 seconds.</p><div class="progress-track"><i id="procBar" style="width:20%"></i></div></div></div></div>';
  }
  function renderReview(root){
    const f=state.form,e=state.errors,meta=state.meta||{};
    function field(key,label,inputId,html,hint){
      return '<div class="field '+(e[key]?'invalid':'')+'"><label for="'+inputId+'">'+U.esc(label)+'</label>'+html+(e[key]?'<span class="err">'+U.esc(e[key])+'</span>':(hint?'<span class="hint">'+U.esc(hint)+'</span>':''))+'</div>';
    }
    const providerOpts=(PT.store.getSettings().providers||PT.data.PROVIDERS).map(function(p){return '<option value="'+U.esc(p)+'"'+(f.provider===p?' selected':'')+'>'+U.esc(p)+'</option>'}).join('');
    const displayedOpts=PT.data.DISPLAYED_STATUSES.map(function(s){return '<option value="'+U.esc(s)+'"'+(f.displayedStatus===s?' selected':'')+'>'+U.esc(s)+'</option>'}).join('');
    let sourceBadge;
    if(meta.source==='gemini'){const c=Math.round(meta.confidence||0),cls=c>=80?'badge-verified':c>=50?'badge-warn':'badge-rejected';sourceBadge='<span class="badge '+cls+'">Gemini · '+c+'% confident · '+U.esc(meta.model)+'</span>';}
    else if(meta.source==='sample')sourceBadge='<span class="badge badge-pending">Sample data — not read from image</span>';
    else sourceBadge='<span class="badge badge-rejected">Extraction failed — enter manually</span>';
    const notesBlock=(meta.notes&&String(meta.notes).trim())?'<div class="callout callout-warn" style="margin-top:12px"><strong>AI notes:</strong> '+U.esc(meta.notes)+'</div>':'';
    root.innerHTML=head()+
      '<div class="review-grid"><section class="card"><div class="card-head"><h3>Receipt image</h3><span class="chip">Step 2 of 3</span></div><div class="card-body"><div class="receipt-frame"><img src="'+U.esc(state.image)+'" alt="Receipt"></div><div class="capture-actions"><button class="btn" type="button" id="rescanBtn">Retake / re-upload</button></div><p class="scan-note">'+sourceBadge+'</p></div></section>'+
      '<section class="card"><div class="card-head"><h3>Review extracted details</h3><span class="chip">Step 3 of 3</span></div><div class="card-body"><div class="callout callout-warn" style="margin-bottom:16px">AI can miss or misread fields. Check every value against the image. New records always start as <strong>Pending Verification</strong>.</div>'+notesBlock+
      '<form id="reviewForm" novalidate style="margin-top:16px"><div class="form-grid"><div class="span-2">'+field('provider','Payment provider','f-provider','<select class="input" id="f-provider"><option value="">— Select —</option>'+providerOpts+'</select>')+'</div>'+
      field('reference','Reference number','f-reference','<input class="input mono" id="f-reference" type="text" value="'+U.esc(f.reference)+'" autocomplete="off">')+
      field('amount','Amount (PHP)','f-amount','<input class="input" id="f-amount" type="number" step="0.01" min="0" value="'+U.esc(f.amount)+'">')+
      field('date','Transaction date','f-date','<input class="input" id="f-date" type="date" value="'+U.esc(f.date)+'">')+
      field('time','Transaction time','f-time','<input class="input" id="f-time" type="time" value="'+U.esc(f.time)+'">')+
      field('sender','Sender name','f-sender','<input class="input" id="f-sender" type="text" value="'+U.esc(f.sender)+'" autocomplete="off">')+
      field('recipient','Recipient name','f-recipient','<input class="input" id="f-recipient" type="text" value="'+U.esc(f.recipient)+'" autocomplete="off">')+
      '<div class="span-2">'+field('displayedStatus','Displayed status on receipt','f-displayed','<select class="input" id="f-displayed">'+displayedOpts+'</select>','Informational only — never auto-verifies.')+'</div>'+
      '</div><div class="form-actions" style="margin-top:16px"><button class="btn" type="button" id="cancelScan">Cancel</button><button class="btn btn-primary" type="submit">Save transaction</button></div></form>'+
      '</div></section></div>';
    const map={'f-provider':'provider','f-reference':'reference','f-amount':'amount','f-date':'date','f-time':'time','f-sender':'sender','f-recipient':'recipient','f-displayed':'displayedStatus'};
    Object.keys(map).forEach(function(id){
      const el=root.querySelector('#'+id);if(!el)return;
      el.addEventListener('input',function(){
        state.form[map[id]]=el.value;
        if(state.errors[map[id]]){state.errors[map[id]]=null;const fEl=el.closest('.field');if(fEl){fEl.classList.remove('invalid');const err=fEl.querySelector('.err');if(err)err.remove()}}
      });
    });
    const refEl=root.querySelector('#f-reference');
    refEl.addEventListener('blur',function(){const dup=PT.store.findByReference(refEl.value);if(dup)U.toast('Reference '+refEl.value.trim()+' already exists ('+dup.id+').','error')});
    root.querySelector('#rescanBtn').addEventListener('click',function(){resetCapture(root)});
    root.querySelector('#cancelScan').addEventListener('click',function(){resetCapture(root)});
    root.querySelector('#reviewForm').addEventListener('submit',function(ev){ev.preventDefault();saveTransaction(root)});
  }
  function openCamera(root){
    cameraError='';
    const video=root.querySelector('#cameraVideo'),empty=root.querySelector('#cameraEmpty'),hint=root.querySelector('#cameraHint');
    if(!PT.camera.isSupported()){cameraError=PT.camera.describeError(new Error('unsupported'));hint.innerHTML='<span style="color:var(--amber)">'+U.esc(cameraError)+'</span>';U.toast('Camera not available — upload or use a sample.','error');return}
    video.hidden=false;empty.hidden=true;hint.textContent='Requesting camera permission…';
    PT.camera.start(video).then(function(){PT.camera.play(video);root.querySelector('#captureBtn').disabled=false;root.querySelector('#openCameraBtn').disabled=true;hint.textContent='Camera is live. Frame the receipt and capture.'})
    .catch(function(err){console.error('[PayTrack] Camera failed:',err);video.hidden=true;empty.hidden=false;cameraError=PT.camera.describeError(err);hint.innerHTML='<span style="color:var(--amber)">'+U.esc(cameraError)+'</span>';U.toast('Camera unavailable — upload or use a sample.','error')});
  }
  function takeShot(root){
    if(!PT.camera.isActive()){U.toast('Camera is not active. Open the camera first.','error');return}
    const dataUrl=PT.camera.capture(videoEl);PT.camera.stop();
    U.downscale(dataUrl,1400,0.85).then(function(small){showPreview(root,small)});
  }
  function handleFile(file,root){
    if(!file)return;
    const isImage=/^image\//i.test(file.type||'')||/\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name||'');
    if(!isImage){U.toast('Please choose an image file.','error');return}
    if(file.size>15*1024*1024){U.toast('Image is larger than 15 MB.','error');return}
    PT.camera.stop();
    const reader=new FileReader();
    reader.onload=function(){
      U.downscale(reader.result,1400,0.85).then(function(small){
        if(!small||small.indexOf('data:image')!==0){U.toast('Could not read that image.','error');return}
        showPreview(root,small);
      });
    };
    reader.onerror=function(){U.toast('Could not read that file.','error')};
    reader.readAsDataURL(file);
  }
  function showPreview(root,small){
    state.image=small;
    const img=root.querySelector('#shotPreview');if(img){img.src=small;img.hidden=false}
    const v=root.querySelector('#cameraVideo');if(v)v.hidden=true;
    const em=root.querySelector('#cameraEmpty');if(em)em.hidden=true;
    root.querySelector('#captureBtn').disabled=true;root.querySelector('#openCameraBtn').disabled=true;root.querySelector('#retakeBtn').hidden=false;
    const hint=root.querySelector('#cameraHint');hint.innerHTML='';
    const go=document.createElement('button');go.className='btn btn-primary';go.type='button';go.textContent='Analyze receipt';
    go.addEventListener('click',function(){startProcessing(root)});
    hint.appendChild(go);
  }
  function useSample(root){
    const tpl=SAMPLES[Math.floor(Math.random()*SAMPLES.length)];
    const svg=PT.data.makeReceiptSvg({provider:tpl.provider,reference:randomRef(tpl.provider),amount:tpl.amount,date:U.todayISO(),time:nowTime(),sender:tpl.sender,recipient:PT.store.getSettings().businessName||'Demo Business',displayedStatus:tpl.displayed});
    state.isSample=true;state.sampleTemplate=tpl;
    showPreview(root,svg);
  }
  function resetCapture(root){
    PT.camera.stop();
    state.phase='capture';state.image=null;state.form=null;state.errors={};state.meta=null;state.isSample=false;state.sampleTemplate=null;
    render(root);
  }
  function startProcessing(root){
    const gen=++procGen;
    state.phase='processing';
    render(root);
    if(state.isSample)return runSample(root,gen);
    if(!PT.gemini.isConfigured()){U.toast('No Gemini API key. Opening manual form.','error');return goManual(root,gen)}
    runGemini(root,gen);
  }
  function runSample(root,gen){
    setTimeout(function(){
      if(gen!==procGen)return;
      const tpl=state.sampleTemplate;
      state.form=formFrom({provider:tpl.provider,reference:randomRef(tpl.provider),amount:tpl.amount,date:U.todayISO(),time:nowTime(),sender:tpl.sender,recipient:PT.store.getSettings().businessName||'Demo Business',displayedStatus:tpl.displayed});
      state.meta={source:'sample',confidence:0,model:'',notes:''};
      state.errors={};state.phase='review';render(root);
    },700);
  }
  function runGemini(root,gen){
    const bar=root.querySelector('#procBar'),label=root.querySelector('#procLabel');
    if(bar)bar.style.width='25%';
    if(label)label.textContent='Uploading image to Gemini…';
    PT.gemini.extractReceipt(state.image).then(function(result){
      if(gen!==procGen)return;
      const f=result.fields||{};
      state.form=formFrom(f);
      state.meta={source:'gemini',confidence:Number(f.confidence)||0,model:result.model,notes:f.notes||''};
      state.errors={};state.phase='review';render(root);
      const missing=['provider','reference','amount','sender'].filter(function(k){return k==='amount'?!(Number(f.amount)>0):!f[k]});
      if(missing.length)U.toast('Gemini could not find: '+missing.join(', ')+'. Please fill them in.','info');
      else U.toast('Receipt analyzed — please verify every field.','success');
    }).catch(function(err){
      if(gen!==procGen)return;
      console.error('[PayTrack] Gemini failed:',err);
      U.toast(err.message||'AI extraction failed. Enter manually.','error');
      goManual(root,gen);
    });
  }
  function goManual(root,gen){
    if(gen!==procGen)return;
    state.form=emptyForm();
    state.meta={source:'manual',confidence:0,model:'',notes:''};
    state.errors={};state.phase='review';render(root);
  }
  function saveTransaction(root){
    state.form={
      provider:root.querySelector('#f-provider').value,
      reference:root.querySelector('#f-reference').value,
      amount:root.querySelector('#f-amount').value,
      date:root.querySelector('#f-date').value,
      time:root.querySelector('#f-time').value,
      sender:root.querySelector('#f-sender').value,
      recipient:root.querySelector('#f-recipient').value,
      displayedStatus:root.querySelector('#f-displayed').value
    };
    const errors=validate(state.form);state.errors=errors;
    if(Object.keys(errors).length){render(root);U.toast('Please fix the highlighted fields.','error');return}
    const tx=PT.store.add({
      provider:state.form.provider,reference:state.form.reference.trim(),
      amount:Math.round(Number(state.form.amount)*100)/100,
      date:state.form.date,time:state.form.time,
      sender:state.form.sender.trim(),recipient:state.form.recipient.trim(),
      displayedStatus:state.form.displayedStatus,
      extractionStatus:extractionStatus(state.form),
      paymentStatus:'Pending Verification',
      receiptImage:state.image
    });
    U.toast('Transaction '+tx.id+' saved — pending verification.','success');
    state.phase='capture';state.image=null;state.form=null;state.meta=null;state.isSample=false;state.sampleTemplate=null;state.errors={};
    PT.app.go('transactions');
  }
  PT.pages.scan={
    title:'Scan Receipt',subtitle:'Powered by Google Gemini Vision',
    render:function(root){this.root=root;render(root)},
    unmount:function(){
      procGen++;PT.camera.stop();
      state.phase='capture';state.image=null;state.form=null;state.meta=null;state.isSample=false;state.sampleTemplate=null;state.errors={};
    },
    refresh:function(){}
  };
})(window.PT);
