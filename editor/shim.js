// editor v1 shim (loaded BEFORE ../app.js): map clicks on symbols ('marks'/'pois') registered by the app are ignored while an edit mode is active.
window.__edShim=true;
(function(){const on=maplibregl.Map.prototype.on;
  maplibregl.Map.prototype.on=function(t,l,f){if(window.__edShim&&t==='click'&&typeof f==='function'&&(l==='marks'||l==='pois')){const g=f;f=function(e){if(window.__devEdit)return;return g.apply(this,arguments)}}
    return on.apply(this,arguments.length>2?[t,l,f]:arguments)}})();
