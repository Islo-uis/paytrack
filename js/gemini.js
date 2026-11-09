(function(PT){
  'use strict';
  const API='https://generativelanguage.googleapis.com/v1beta';
  const DEF_MODEL='gemini-2.0-flash';
  const PROMPT=[
    'You are an OCR assistant for a Philippine SME payments tracker.',
    'Read the attached receipt or screenshot and extract transaction details.',
    '',
    'Rules:',
    '- Supported providers: GCash, Maya, BPI, BDO, UnionBank, Other Banks.',
    '- provider: one of the exact strings above, or empty if unknown.',
    '- reference: the reference / transaction number as shown.',
    '- amount: numeric PHP value only. No symbols or commas.',
    '- date: YYYY-MM-DD. If year not shown, use current year.',
    '- time: HH:MM 24-hour. Empty if not visible.',
    '- sender: full name of sender. Empty if not shown.',
    '- recipient: full name of receiver. Empty if not shown.',
    '- displayedStatus: literal status on receipt ("Successful","Pending","Failed","Unknown").',
    '- confidence: 0-100.',
    '- notes: short caveats, else empty.',
    'Never invent data. Return ONLY JSON matching the schema.'
  ].join('\n');
  const SCHEMA={type:'OBJECT',properties:{
    provider:{type:'STRING'},reference:{type:'STRING'},amount:{type:'NUMBER'},
    date:{type:'STRING'},time:{type:'STRING'},sender:{type:'STRING'},
    recipient:{type:'STRING'},displayedStatus:{type:'STRING'},
    confidence:{type:'NUMBER'},notes:{type:'STRING'}
  },required:['provider','reference','amount','date','displayedStatus','confidence']};
  const SAFETY=[
    {category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_NONE'},
    {category:'HARM_CATEGORY_HATE_SPEECH',threshold:'BLOCK_NONE'},
    {category:'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold:'BLOCK_NONE'},
    {category:'HARM_CATEGORY_DANGEROUS_CONTENT',threshold:'BLOCK_NONE'}
  ];
  function getApiKey(){return PT.storage.loadApiKey()}
  function getModel(){const s=PT.store.getSettings();return (s&&s.geminiModel)||DEF_MODEL}
  function isConfigured(){return !!getApiKey()}
  function strip(dataUrl){const m=/^data:([^;]+);base64,(.+)$/i.exec(dataUrl||'');if(!m)throw new Error('Not a valid base64 image.');return{mime:m[1],base64:m[2]}}
  function httpErr(status,body){
    let detail='';
    try{const j=JSON.parse(body);if(j.error&&j.error.message)detail=j.error.message}catch(e){}
    if(status===400){
      if(/API key not valid|API_KEY_INVALID/i.test(detail))return new Error('Invalid Gemini API key. Check Settings.');
      return new Error('Gemini rejected: '+(detail||'Bad Request')+'.');
    }
    if(status===403)return new Error('Key lacks permission. Enable the Generative Language API in Google Cloud.');
    if(status===404)return new Error('Model "'+getModel()+'" not available. Try "gemini-1.5-flash" in Settings.');
    if(status===429)return new Error('Rate limit reached. Wait a minute and retry.');
    if(status>=500)return new Error('Gemini server error ('+status+').');
    return new Error('Gemini error '+status+(detail?': '+detail:''));
  }
  async function postJson(key,model,body){
    const url=API+'/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(key);
    let resp;
    try{
      resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }catch(e){
      throw new Error('Network error reaching Gemini. Possible causes: no internet, ad-blocker, or CORS. Try a different browser. ('+e.message+')');
    }
    const text=await resp.text();
    if(!resp.ok)throw httpErr(resp.status,text);
    try{return JSON.parse(text)}catch(e){throw new Error('Gemini response not JSON.')}
  }
  async function extractReceipt(imageDataUrl){
    const key=getApiKey();
    if(!key)throw new Error('No Gemini API key configured. Add one in Settings.');
    const model=getModel();
    const {mime,base64}=strip(imageDataUrl);
    const body={
      contents:[{parts:[{text:PROMPT},{inline_data:{mime_type:mime,data:base64}}]}],
      generationConfig:{temperature:0.1,responseMimeType:'application/json',responseSchema:SCHEMA},
      safetySettings:SAFETY
    };
    const json=await postJson(key,model,body);
    if(json.promptFeedback&&json.promptFeedback.blockReason)throw new Error('Image blocked by Gemini safety filters.');
    const cand=json.candidates&&json.candidates[0];
    if(!cand||!cand.content||!cand.content.parts||!cand.content.parts.length)throw new Error('Gemini returned no content. Try a clearer image.');
    const textPart=cand.content.parts.find(function(p){return typeof p.text==='string'});
    if(!textPart)throw new Error('Gemini returned no text.');
    let parsed;
    try{parsed=JSON.parse(textPart.text)}catch(e){
      const cleaned=textPart.text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/i,'').trim();
      try{parsed=JSON.parse(cleaned)}catch(e2){throw new Error('Gemini JSON could not be parsed.')}
    }
    return{fields:parsed,model,usage:json.usageMetadata||null};
  }
  async function testConnection(key,model){
    const k=key||getApiKey();
    if(!k)throw new Error('Paste your API key first.');
    const m=model||getModel();
    const body={contents:[{parts:[{text:'Reply with the single word: OK'}]}],generationConfig:{temperature:0,maxOutputTokens:8}};
    const json=await postJson(k,m,body);
    const cand=json.candidates&&json.candidates[0];
    const part=cand&&cand.content&&cand.content.parts&&cand.content.parts[0];
    if(!part||!part.text)throw new Error('Gemini returned no text — key may be invalid.');
    return{ok:true,reply:part.text.trim(),model:m};
  }
  PT.gemini={DEFAULT_MODEL:DEF_MODEL,isConfigured,extractReceipt,testConnection};
})(window.PT);
