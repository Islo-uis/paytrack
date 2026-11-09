(function(PT){
  'use strict';
  let stream=null;
  function isSupported(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)}
  function start(video){
    if(!isSupported())return Promise.reject(new Error('unsupported'));
    return navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200}},audio:false}).then(function(s){
      stream=s;video.srcObject=s;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.muted=true;
      return play(video).then(function(){return s});
    }).catch(function(err){stop();throw err});
  }
  function play(video){
    try{const p=video.play();if(p&&p.catch)return p.catch(function(e){console.warn('play rejected',e&&e.name)});}catch(e){}
    return Promise.resolve();
  }
  function stop(){if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null}}
  function isActive(){return !!stream}
  function capture(video,maxWidth){
    maxWidth=maxWidth||1280;
    const vw=video.videoWidth||1280,vh=video.videoHeight||960,scale=Math.min(1,maxWidth/vw);
    const c=document.createElement('canvas');c.width=Math.round(vw*scale);c.height=Math.round(vh*scale);
    c.getContext('2d').drawImage(video,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',0.82);
  }
  function describeError(err){
    if(!err)return 'Camera could not be started.';
    switch(err.name){
      case 'NotAllowedError':case 'SecurityError':return 'Camera permission was denied. Allow access in your browser, or upload an image instead.';
      case 'NotFoundError':case 'OverconstrainedError':return 'No camera found. Upload an image instead.';
      case 'NotReadableError':return 'Camera is in use by another app. Upload an image instead.';
      default:if(err.message==='unsupported')return 'Camera not supported. Upload an image instead.';
        return 'Camera could not be started. Upload an image instead.';
    }
  }
  PT.camera={isSupported,start,play,stop,isActive,capture,describeError};
})(window.PT);
