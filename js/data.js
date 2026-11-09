(function(PT){
  'use strict';
  const U=PT.utils;
  const PROVIDERS=['GCash','Maya','BPI','BDO','UnionBank','Other Banks'];
  const EXTRACTION_STATUSES=['Successfully Extracted','Incomplete','Needs Review'];
  const PAYMENT_STATUSES=['Pending Verification','Verified','Rejected','Unmatched'];
  const DISPLAYED_STATUSES=['Successful','Pending','Failed'];
  const DEFAULT_SETTINGS={
    businessName:'Demo Business',owner:'Jamie Dela Cruz',role:'Cashier',
    email:'hello@demobusiness.ph',phone:'+63 917 555 0142',
    address:'Unit 402 Mabini Tower, 123 Ayala Ave., Makati City',tin:'004-215-889-000',
    currency:'PHP',providers:PROVIDERS.slice(),rowsPerPage:8,defaultStatus:'All',geminiModel:'gemini-2.0-flash'
  };
  const SAMPLES=[
    [0,'09:12','GCash','GC-8842015',2500,'Maria Santos','Pending Verification','Successfully Extracted','Successful'],
    [0,'10:45','Maya','MY-5512309',1850.5,'Jose Ramirez','Verified','Successfully Extracted','Successful'],
    [0,'13:20','BPI','BPI-9087712',12500,'Ana Villanueva','Verified','Successfully Extracted','Successful'],
    [0,'15:02','GCash','GC-8842377',980,'Carlo Mendoza','Unmatched','Needs Review','Successful'],
    [1,'08:40','BDO','BDO-4471209',7600,'Liza Fernandez','Verified','Successfully Extracted','Successful'],
    [1,'11:15','UnionBank','UB-3320981',3200,'Mark Anthony Cruz','Pending Verification','Successfully Extracted','Successful'],
    [1,'16:30','Maya','MY-5512988',450,'Grace Lim','Rejected','Incomplete','Failed'],
    [2,'09:05','GCash','GC-8842901',1500,'Ramon Bautista','Verified','Successfully Extracted','Successful'],
    [2,'14:22','Other Banks','SEC-778120',8900,'Cristina Aquino','Pending Verification','Needs Review','Successful'],
    [3,'10:10','BPI','BPI-9087990',22000,'Fernando Lopez','Verified','Successfully Extracted','Successful'],
    [3,'17:45','Maya','MY-5513401',675.25,'Angela Domingo','Pending Verification','Successfully Extracted','Successful'],
    [4,'12:00','BDO','BDO-4471888',5400,'Paolo Garcia','Unmatched','Needs Review','Successful'],
    [5,'08:55','GCash','GC-8843200',1200,'Jasmine Tan','Verified','Successfully Extracted','Successful'],
    [5,'15:40','UnionBank','UB-3321455',9800,'Ricardo Mercado','Verified','Successfully Extracted','Successful'],
    [6,'11:30','BPI','BPI-9088210',3300,'Elena Bautista','Pending Verification','Incomplete','Successful']
  ];
  function makeReceiptSvg(t){
    const e=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
    const amount=Number(t.amount).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
    function row(l,v,y){return '<text x="40" y="'+y+'" font-family="Helvetica,sans-serif" font-size="12" fill="#7a8598">'+e(l)+'</text><text x="380" y="'+y+'" text-anchor="end" font-family="Helvetica,sans-serif" font-size="12.5" font-weight="bold" fill="#101828">'+e(v)+'</text>'}
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560"><rect width="420" height="560" fill="#eef1f5"/><rect x="20" y="20" width="380" height="520" rx="14" fill="#fff" stroke="#dfe4ea"/><path d="M20 34a14 14 0 0 1 14-14h352a14 14 0 0 1 14 14v56H20z" fill="#101828"/><text x="42" y="64" font-family="Helvetica,sans-serif" font-size="19" font-weight="bold" fill="#fff">'+e(t.provider)+'</text><text x="378" y="64" text-anchor="end" font-family="Helvetica,sans-serif" font-size="10.5" fill="#9fb0c9">E-RECEIPT</text><text x="40" y="124" font-family="Helvetica,sans-serif" font-size="10.5" fill="#7a8598">AMOUNT</text><text x="40" y="160" font-family="Helvetica,sans-serif" font-size="31" font-weight="bold" fill="#101828">PHP '+e(amount)+'</text><line x1="40" y1="188" x2="380" y2="188" stroke="#e6e9ee" stroke-dasharray="4 4"/>'+row('Reference',t.reference,220)+row('Date',U.fmtDate(t.date),250)+row('Time',U.fmtTime(t.time),280)+row('From',t.sender||'—',310)+row('To',t.recipient||'Demo Business',340)+row('Status',t.displayedStatus||'Successful',370)+'<text x="210" y="470" text-anchor="middle" font-family="Helvetica,sans-serif" font-size="11" fill="#b6c0cf">PayTrack PH · Sample</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function sampleTransactions(){
    return SAMPLES.map(function(s,i){
      const ago=s[0],time=s[1],provider=s[2],reference=s[3],amount=s[4],sender=s[5],paymentStatus=s[6],extractionStatus=s[7],displayedStatus=s[8];
      const date=U.daysAgoISO(ago),createdAt=new Date(date+'T'+time+':00').toISOString();
      const tx={id:'TXN-'+String(i+1).padStart(4,'0'),provider,reference,amount,date,time,sender,recipient:'Demo Business',displayedStatus,extractionStatus,paymentStatus,createdAt,recordedBy:'Jamie Dela Cruz',notes:'',receiptImage:null,log:[{ts:createdAt,action:'Transaction recorded',by:'Jamie Dela Cruz'}]};
      tx.receiptImage=makeReceiptSvg(tx);
      if(paymentStatus==='Verified')tx.log.push({ts:new Date(new Date(createdAt).getTime()+3600000).toISOString(),action:'Payment status changed to Verified',by:'Jamie Dela Cruz'});
      else if(paymentStatus==='Rejected')tx.log.push({ts:new Date(new Date(createdAt).getTime()+5400000).toISOString(),action:'Payment status changed to Rejected',by:'Jamie Dela Cruz'});
      return tx;
    });
  }
  PT.data={PROVIDERS,EXTRACTION_STATUSES,PAYMENT_STATUSES,DISPLAYED_STATUSES,DEFAULT_SETTINGS,sampleTransactions,makeReceiptSvg};
})(window.PT);
