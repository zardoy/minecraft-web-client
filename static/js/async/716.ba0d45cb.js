"use strict";(self.webpackChunkminecraft_web_client=self.webpackChunkminecraft_web_client||[]).push([["716"],{98030:function(o,a,l){l.r(a),l.d(a,{NextConsole:()=>Be,createPerformancePlugin:()=>Ne,createSourcePlugin:()=>ze,default:()=>Be});let c=!1;function j(o){if(!c){c=!0;try{console.error("[NextConsole] event listener error",o)}finally{c=!1}}}let P=class P{constructor(){this.listeners=new Map}on(o,a){return this.listeners.has(o)||this.listeners.set(o,new Set),this.listeners.get(o).add(a),()=>this.off(o,a)}off(o,a){this.listeners.get(o)?.delete(a)}emit(o,...a){this.listeners.get(o)?.forEach(o=>{try{o(...a)}catch(o){j(o)}})}removeAllListeners(){this.listeners.clear()}};function A(o){let a=new Date(o),l=String(a.getHours()).padStart(2,"0"),c=String(a.getMinutes()).padStart(2,"0"),d=String(a.getSeconds()).padStart(2,"0"),p=String(a.getMilliseconds()).padStart(3,"0");return`${l}:${c}:${d}.${p}`}function q(o){return o<1?"<1ms":o<1e3?`${Math.round(o)}ms`:`${(o/1e3).toFixed(2)}s`}let d=0,p={maxLogs:1e4,hookConsole:!0},u=["log","info","warn","error","debug"];let J=class J extends P{constructor(o){super(),this.entries=[],this.originals=new Map,this.hooked=!1,this.streamBuffers=new Map,this.flushTimer=null,this.pendingStreamEntries=new Set,this.options={...p,...o}}init(){if(!this.hooked&&this.options.hookConsole){for(let o of u){let a=console[o].bind(console);this.originals.set(o,a),console[o]=(...l)=>{a(...l),this.addEntry(o,l)}}this.hooked=!0}}addEntry(o,a){let l;("error"===o||"warn"===o)&&(l=Error().stack?.split(`
`).slice(3).join(`
`));let c={id:++d,level:o,args:this.cloneArgs(a),timestamp:Date.now(),stack:l};this.entries.push(c),this.entries.length>this.options.maxLogs&&this.entries.splice(0,this.entries.length-this.options.maxLogs),this.emit("entry",c)}appendStream(o,a){let l=this.streamBuffers.get(o);l?(l.args=[l.args[0]+a],this.scheduleStreamFlush(l)):(l={id:++d,level:"log",args:[a],timestamp:Date.now(),streamId:o,streaming:!0},this.streamBuffers.set(o,l),this.entries.push(l),this.emit("entry",l))}endStream(o){let a=this.streamBuffers.get(o);a&&(a.streaming=!1,this.streamBuffers.delete(o),this.emit("streamUpdate",a))}scheduleStreamFlush(o){this.pendingStreamEntries.add(o),null===this.flushTimer&&(this.flushTimer=requestAnimationFrame(()=>{for(let o of(this.flushTimer=null,this.pendingStreamEntries))this.emit("streamUpdate",o);this.pendingStreamEntries.clear()}))}cloneArgs(o){return o.map(o=>{if(o instanceof Error)return{message:o.message,stack:o.stack,name:o.name};if(o instanceof HTMLElement)return`<${o.tagName.toLowerCase()}>`;if(o instanceof Date)return o.toISOString();if(o instanceof RegExp)return o.toString();if(o instanceof Map)try{return{__type:"Map",entries:JSON.parse(JSON.stringify([...o]))}}catch{return`Map(${o.size})`}if(o instanceof Set)try{return{__type:"Set",values:JSON.parse(JSON.stringify([...o]))}}catch{return`Set(${o.size})`}if("symbol"==typeof o)return o.toString();if("function"==typeof o)return`ƒ ${o.name||"anonymous"}()`;if("object"==typeof o&&null!==o)try{return JSON.parse(JSON.stringify(o))}catch{return String(o)}return o})}getEntries(){return this.entries}getFilteredEntries(o,a){let l=this.entries;if(o&&o.length>0&&(l=l.filter(a=>o.includes(a.level))),a){let o=a.toLowerCase();l=l.filter(a=>a.args.some(a=>String(a).toLowerCase().includes(o)))}return l}clear(){this.entries.length=0,this.streamBuffers.clear(),this.emit("clear")}exportJSON(){return JSON.stringify(this.entries,null,2)}destroy(){if(this.hooked){for(let o of u){let a=this.originals.get(o);a&&(console[o]=a)}this.originals.clear(),this.hooked=!1,null!==this.flushTimer&&cancelAnimationFrame(this.flushTimer),this.pendingStreamEntries.clear(),this.removeAllListeners()}}};let g={maxRequests:500,hookFetch:!0,hookXHR:!0,hookSSE:!0,hookWebSocket:!0,previewFetchResponseBody:!1},f=["text/event-stream","application/x-ndjson","application/json-seq","application/jsonl"],b=["application/octet-stream","application/pdf","application/zip","application/gzip","application/x-tar","application/x-7z-compressed"];function X(o){return"u">typeof Request&&o instanceof Request}function Q(o){return"string"==typeof o?o:o instanceof URL?o.href:o.url}function Z(o,a){return(a?.method||(X(o)?o.method:"GET")).toUpperCase()}function ee(o,a){let l=new Headers(X(o)?o.headers:void 0);a?.headers&&new Headers(a.headers).forEach((o,a)=>l.set(a,o));let c={};return l.forEach((o,a)=>c[a]=o),c}function N(o){return"boolean"==typeof o?o:!!o?.capture}function te(o){let a=o.headers.get("content-length");if(!a)return null;let l=Number(a);return Number.isFinite(l)&&l>=0?l:null}function D(o){if(null==o)return null;if("string"==typeof o)return o;if("u">typeof URLSearchParams&&o instanceof URLSearchParams)return o.toString();if("u">typeof FormData&&o instanceof FormData){let a={};return o.forEach((o,l)=>{a[l]="string"==typeof o?o:`[File: ${o.name}]`}),a}return"u">typeof Blob&&o instanceof Blob?`[Blob: ${o.size} bytes]`:o instanceof ArrayBuffer?`[ArrayBuffer: ${o.byteLength} bytes]`:ArrayBuffer.isView(o)?`[${o.constructor.name}: ${o.byteLength} bytes]`:String(o)}function ne(o){let a=o.responseType||"text";if("json"===a)return o.response;if("blob"===a){let a=o.response;return a?`[Blob: ${a.size} bytes]`:"[Blob]"}if("arraybuffer"===a){let a=o.response;return a?`[ArrayBuffer: ${a.byteLength} bytes]`:"[ArrayBuffer]"}if("document"===a){let a=o.response;return a?`[Document: ${a.contentType||"unknown"}]`:"[Document]"}try{let a=o.getResponseHeader("content-type")||"",l=o.responseText||"",c=l.length>1e4?`${l.slice(0,1e4)}...(truncated)`:l;if(a.includes("application/json"))try{return JSON.parse(l)}catch{}return c}catch{return"[Unable to read body]"}}let se=class se extends P{constructor(o){super(),this.entries=[],this.originalFetch=null,this.originalXHR=null,this.originalXHRSend=null,this.originalXHRSetHeader=null,this.originalEventSource=null,this.originalWebSocket=null,this.scheduledStreamUpdates=new Map,this.hooked=!1,this.options={...g,...o}}init(){this.hooked||(this.options.hookFetch&&this.hookFetch(),this.options.hookXHR&&this.hookXHR(),this.options.hookSSE&&this.hookSSE(),this.options.hookWebSocket&&this.hookWebSocket(),this.hooked=!0)}hookFetch(){this.originalFetch=window.fetch.bind(window);let o=this,a=this.originalFetch;window.fetch=async function(l,c){let p=Q(l),u=Z(l,c),g=ee(l,c),f={id:++d,type:"fetch",method:u,url:p,requestHeaders:g,requestBody:D(c?.body),status:0,statusText:"",responseHeaders:{},responseBody:null,startTime:performance.now(),endTime:0,duration:0,pending:!0};o.addEntry(f);try{let d=await a(l,c);return f.status=d.status,f.statusText=d.statusText,d.headers.forEach((o,a)=>f.responseHeaders[a]=o),f.endTime=performance.now(),f.duration=f.endTime-f.startTime,f.pending=!1,o.options.previewFetchResponseBody||(f.responseBody="[Fetch response body preview disabled]"),o.emit("update",f),o.options.previewFetchResponseBody&&o.scheduleFetchBodyCapture(d,f,u),d}catch(a){throw f.endTime=performance.now(),f.duration=f.endTime-f.startTime,f.pending=!1,f.error=a instanceof Error?a.message:String(a),o.emit("update",f),a}}}scheduleFetchBodyCapture(o,a,l){window.setTimeout(()=>{this.captureFetchBody(o,a,l)},0)}async captureFetchBody(o,a,l){let c,d=this.getBodySkipReason(o,l);if(null!==d){if(d){a.responseBody=d,this.emit("update",a);return}try{c=o.clone()}catch{a.responseBody="[Unable to read body]",this.emit("update",a);return}try{let l=o.headers.get("content-type")?.toLowerCase()||"",d=await this.readTextPreview(c,1e4),p=d.truncated?`${d.text}...(truncated)`:d.text;if(!d.truncated&&l.includes("json"))try{a.responseBody=JSON.parse(d.text)}catch{a.responseBody=p}else a.responseBody=p}catch{a.responseBody="[Unable to read body]"}this.emit("update",a)}}getBodySkipReason(o,a){if("HEAD"===a||[204,205,304].includes(o.status)||!o.body)return null;if(o.bodyUsed||o.body.locked)return"[Response body consumed by page]";let l=o.headers.get("content-type")?.toLowerCase()||"";if(f.some(o=>l.includes(o))||l.includes("stream"))return"[Streaming response body omitted]";if(l.startsWith("image/")||l.startsWith("audio/")||l.startsWith("video/")||l.startsWith("font/")||b.some(o=>l.includes(o)))return"[Binary response body omitted]";let c=te(o);return null===c?"[Response body preview skipped: unknown size]":0===c?null:c>1e4?`[Response body omitted: ${c} bytes]`:void 0}async readTextPreview(o,a){if(!o.body)return{text:"",truncated:!1};let l=o.body.getReader(),c=new TextDecoder,d="",p=!1;try{for(;;){let{done:o,value:u}=await l.read();if(o)break;if((d+=c.decode(u,{stream:!0})).length>a){d=d.slice(0,a),p=!0,await l.cancel();break}}p||(d+=c.decode())}finally{try{l.releaseLock()}catch{}}return{text:d,truncated:p}}pushSSEEvent(o,a){let l=o.sseEvents;l&&(l.length>=1e3&&l.splice(0,l.length-1e3+100),l.push(a))}pushStreamMessage(o,a){let l=o.messages;l&&(l.length>=1e3&&l.splice(0,l.length-1e3+100),l.push(a),this.scheduleStreamUpdate(o))}scheduleStreamUpdate(o){if(this.scheduledStreamUpdates.has(o.id))return;let t=()=>{this.scheduledStreamUpdates.delete(o.id),this.emit("update",o)};if("function"==typeof window.requestAnimationFrame){let a=window.requestAnimationFrame(t);this.scheduledStreamUpdates.set(o.id,{type:"raf",handle:a});return}let a=window.setTimeout(t,16);this.scheduledStreamUpdates.set(o.id,{type:"timeout",handle:a})}cancelScheduledStreamUpdate(o){let a=this.scheduledStreamUpdates.get(o.id);a&&("raf"===a.type?window.cancelAnimationFrame(a.handle):window.clearTimeout(a.handle),this.scheduledStreamUpdates.delete(o.id))}emitUpdateNow(o){this.cancelScheduledStreamUpdate(o),this.emit("update",o)}hookXHR(){let o=this,a=XMLHttpRequest.prototype.open,l=XMLHttpRequest.prototype.send,c=XMLHttpRequest.prototype.setRequestHeader;this.originalXHR=a,this.originalXHRSend=l,this.originalXHRSetHeader=c,XMLHttpRequest.prototype.open=function(o,l){return this._nc_headers={},this._nc_entry={id:++d,type:"xhr",method:o.toUpperCase(),url:String(l),requestHeaders:this._nc_headers,requestBody:null,status:0,statusText:"",responseHeaders:{},responseBody:null,startTime:0,endTime:0,duration:0,pending:!0},a.apply(this,arguments)},XMLHttpRequest.prototype.setRequestHeader=function(o,a){return this._nc_headers&&(this._nc_headers[o]=a),c.call(this,o,a)},XMLHttpRequest.prototype.send=function(a){let c=this._nc_entry;return c&&(c.startTime=performance.now(),c.requestBody=D(a),o.addEntry(c),this.addEventListener("loadend",()=>{c.status=this.status,c.statusText=this.statusText,c.endTime=performance.now(),c.duration=c.endTime-c.startTime,c.pending=!1;let a=this.getAllResponseHeaders();a&&a.split(`\r
`).forEach(o=>{let a=o.indexOf(":");a>0&&(c.responseHeaders[o.slice(0,a).trim()]=o.slice(a+1).trim())}),c.responseBody=ne(this),o.emit("update",c)}),this.addEventListener("error",()=>{c.endTime=performance.now(),c.duration=c.endTime-c.startTime,c.pending=!1,c.error="Network Error",o.emit("update",c)})),l.call(this,a)}}hookSSE(){if(typeof EventSource>"u")return;let o=this,a=EventSource;this.originalEventSource=a;let n=function(l,c){let p=new a(l,c),u={id:++d,type:"sse",method:"GET",url:String(l),requestHeaders:{},requestBody:null,status:0,statusText:"SSE",responseHeaders:{},responseBody:null,startTime:performance.now(),endTime:0,duration:0,pending:!0,sseEvents:[],messages:[]};o.addEntry(u),p.addEventListener("open",()=>{u.status=200,o.emit("update",u)});let g=p.addEventListener.bind(p),f=p.removeEventListener.bind(p),b=new Map;return p.addEventListener=function(a,l,c){if(!l)return g(a,l,c);if("open"!==a&&"error"!==a&&"message"!==a){let d=N(c),f=b.get(a);f||(f=new WeakMap,b.set(a,f));let y=f.get(l);y||(y=new Map,f.set(l,y));let x=y.get(d);return x||(x=function(c){let d={data:c.data,timestamp:Date.now(),id:c.lastEventId||void 0,event:a};o.pushSSEEvent(u,d);let g={direction:"in",data:c.data,timestamp:Date.now(),event:a,size:"string"==typeof c.data?c.data.length:0};o.pushStreamMessage(u,g),"function"==typeof l?l.call(p,c):l.handleEvent(c)},y.set(d,x)),g(a,x,c)}return g(a,l,c)},p.removeEventListener=function(o,a,l){if(a&&"open"!==o&&"error"!==o&&"message"!==o){let c=b.get(o),d=c?.get(a),p=d?.get(N(l));if(p)return d?.delete(N(l)),d?.size===0&&c?.delete(a),f(o,p,l)}return f(o,a,l)},g("message",a=>{let l={data:a.data,timestamp:Date.now(),id:a.lastEventId||void 0};o.pushSSEEvent(u,l);let c={direction:"in",data:a.data,timestamp:Date.now(),size:"string"==typeof a.data?a.data.length:0};o.pushStreamMessage(u,c)}),p.addEventListener("error",()=>{u.pending=!1,u.endTime=performance.now(),u.duration=u.endTime-u.startTime,u.error="SSE Connection Error",o.emitUpdateNow(u)}),p};Object.defineProperties(n,{CONNECTING:{value:a.CONNECTING},OPEN:{value:a.OPEN},CLOSED:{value:a.CLOSED},prototype:{value:a.prototype}}),window.EventSource=n}hookWebSocket(){if(typeof WebSocket>"u")return;let o=this,a=WebSocket;this.originalWebSocket=a;let n=function(l,c){let p=new a(l,c),u={id:++d,type:"websocket",method:"WS",url:String(l),requestHeaders:{},requestBody:null,status:0,statusText:"WebSocket",responseHeaders:{},responseBody:null,startTime:performance.now(),endTime:0,duration:0,pending:!0,messages:[]};o.addEntry(u),p.addEventListener("open",()=>{u.status=101,u.statusText="Switching Protocols",o.emit("update",u)}),p.addEventListener("message",a=>{let l={direction:"in",data:"string"==typeof a.data?a.data:"[Binary]",timestamp:Date.now(),size:"string"==typeof a.data?a.data.length:a.data?.byteLength||0};o.pushStreamMessage(u,l)}),p.addEventListener("close",a=>{u.pending=!1,u.endTime=performance.now(),u.duration=u.endTime-u.startTime,u.statusText=`Closed (${a.code})`,o.emitUpdateNow(u)}),p.addEventListener("error",()=>{u.pending=!1,u.endTime=performance.now(),u.duration=u.endTime-u.startTime,u.error="WebSocket Error",o.emitUpdateNow(u)});let g=p.send.bind(p);return p.send=function(a){let l={direction:"out",data:"string"==typeof a?a:"[Binary]",timestamp:Date.now(),size:"string"==typeof a?a.length:a?.byteLength||0};return o.pushStreamMessage(u,l),g(a)},p};Object.defineProperties(n,{CONNECTING:{value:a.CONNECTING},OPEN:{value:a.OPEN},CLOSING:{value:a.CLOSING},CLOSED:{value:a.CLOSED},prototype:{value:a.prototype}}),window.WebSocket=n}addEntry(o){this.entries.push(o),this.entries.length>this.options.maxRequests&&this.entries.splice(0,this.entries.length-this.options.maxRequests),this.emit("request",o)}getEntries(){return this.entries}clear(){this.entries.length=0,this.emit("clear")}destroy(){this.hooked&&(this.scheduledStreamUpdates.forEach(o=>{"raf"===o.type?window.cancelAnimationFrame(o.handle):window.clearTimeout(o.handle)}),this.scheduledStreamUpdates.clear(),this.originalFetch&&(window.fetch=this.originalFetch),this.originalXHR&&(XMLHttpRequest.prototype.open=this.originalXHR),this.originalXHRSend&&(XMLHttpRequest.prototype.send=this.originalXHRSend),this.originalXHRSetHeader&&(XMLHttpRequest.prototype.setRequestHeader=this.originalXHRSetHeader),this.originalEventSource&&(window.EventSource=this.originalEventSource),this.originalWebSocket&&(window.WebSocket=this.originalWebSocket),this.hooked=!1,this.removeAllListeners())}};let y={showLocalStorage:!0,showSessionStorage:!0,showCookies:!0};let oe=class oe extends P{constructor(o){super(),this.options={...y,...o}}init(){}getEntries(o){let a=[];return this.options.showLocalStorage&&a.push(...this.readWebStorage("localStorage",o)),this.options.showSessionStorage&&a.push(...this.readWebStorage("sessionStorage",o)),this.options.showCookies&&a.push(...this.readCookies(o)),a}readWebStorage(o,a){let l=[];try{let c="localStorage"===o?localStorage:sessionStorage;for(let d=0;d<c.length;d++){let p=c.key(d);null!==p&&(a&&!p.toLowerCase().includes(a.toLowerCase())||l.push({key:p,value:c.getItem(p)||"",type:o}))}}catch{}return l}readCookies(o){let a=[],l=document.cookie;if(!l)return a;for(let c of l.split(";")){let l,d=c.indexOf("=");if(d<0)continue;let p=c.slice(0,d).trim(),u=c.slice(d+1).trim();if(!o||p.toLowerCase().includes(o.toLowerCase())){try{l=decodeURIComponent(u)}catch{l=u}a.push({key:p,value:l,type:"cookie"})}}return a}setItem(o,a,l,c){let d=!1;try{if("localStorage"===o)localStorage.setItem(a,l),d=!0;else if("sessionStorage"===o)sessionStorage.setItem(a,l),d=!0;else if("cookie"===o){let o=`${encodeURIComponent(a)}=${encodeURIComponent(l)}`;c?.domain&&(o+=`; domain=${c.domain}`),c?.path?o+=`; path=${c.path}`:o+="; path=/",c?.expires&&(o+=`; expires=${c.expires}`),c?.secure&&(o+="; secure"),c?.sameSite&&(o+=`; SameSite=${c.sameSite}`),document.cookie=o,d=this.readCookies().some(o=>o.key===a&&o.value===l)}}catch{}return this.emit("update"),d}removeItem(o,a){try{if("localStorage"===o)localStorage.removeItem(a);else if("sessionStorage"===o)sessionStorage.removeItem(a);else if("cookie"===o)for(let o of["/",window.location.pathname])document.cookie=`${encodeURIComponent(a)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${o}`}catch{}this.emit("update")}clearAll(o){try{if("localStorage"===o)localStorage.clear();else if("sessionStorage"===o)sessionStorage.clear();else if("cookie"===o)for(let o of this.readCookies())this.removeItem("cookie",o.key)}catch{}this.emit("update")}destroy(){this.removeAllListeners()}};function m(...o){return o.map(o=>`nc-${o}`).join(" ")}function v(o,a,l,c){return o.addEventListener(a,l,c),()=>o.removeEventListener(a,l,c)}function R(o,a,l){return Math.max(a,Math.min(l,o))}function h(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}let ae=class ae{constructor(){this.highlightOverlay=null}init(){this.highlightOverlay=document.createElement("div"),Object.assign(this.highlightOverlay.style,{position:"fixed",zIndex:"2147483646",pointerEvents:"none",border:"2px solid #61dafb",backgroundColor:"rgba(97, 218, 251, 0.1)",display:"none"}),document.body.appendChild(this.highlightOverlay)}renderTree(o=document.documentElement,a=8){return this.renderNode(o,0,a)}renderNode(o,a,l){if(a>=l)return`<div class="${m("dom-node")}" style="padding-left:${16*a}px">...</div>`;let c=o.tagName.toLowerCase(),d=this.renderAttributes(o),p=o.children.length>0,u=`nc-dom-${a}-${c}-${Math.random().toString(36).slice(2,8)}`,g=h(this.getSelector(o)),f="";if(p){f+=`<div class="${m("dom-node","dom-collapsible")}" style="padding-left:${16*a}px">`,f+=`<span class="${m("dom-toggle")}" data-nc-toggle="${u}">▶</span> `,f+=`<span class="${m("dom-tag")}" data-nc-highlight="${g}">&lt;${h(c)}</span>`,f+=d,f+=`<span class="${m("dom-tag")}">&gt;</span>`,f+="</div>",f+=`<div class="${m("dom-children")}" id="${u}" style="display:none">`;for(let c=0;c<o.children.length;c++)f+=this.renderNode(o.children[c],a+1,l);f+=`<div class="${m("dom-node")}" style="padding-left:${16*a}px">`,f+=`<span class="${m("dom-tag")}">&lt;/${h(c)}&gt;</span>`,f+="</div>",f+="</div>"}else{let l=o.textContent?.trim(),p=l&&l.length>0?h(l.slice(0,60)):"";f+=`<div class="${m("dom-node")}" style="padding-left:${16*a}px">`,f+=`<span class="${m("dom-tag")}" data-nc-highlight="${g}">&lt;${h(c)}</span>`,f+=d,p?(f+=`<span class="${m("dom-tag")}">&gt;</span>`,f+=`<span class="${m("dom-text")}">${p}</span>`,f+=`<span class="${m("dom-tag")}">&lt;/${h(c)}&gt;</span>`):f+=`<span class="${m("dom-tag")}">/&gt;</span>`,f+="</div>"}return f}renderAttributes(o){let a="";for(let l=0;l<o.attributes.length;l++){let c=o.attributes[l];a+=` <span class="${m("dom-attr")}">${h(c.name)}</span>=<span class="${m("dom-attr-val")}">"${h(c.value.slice(0,80))}"</span>`}return a}getSelector(o){if(o.id)return`#${CSS.escape(o.id)}`;let a=o.tagName.toLowerCase();if(o.className&&"string"==typeof o.className){let l=o.className.split(" ").filter(Boolean).map(o=>CSS.escape(o)).join(".");return l?`${a}.${l}`:a}return a}highlight(o){if(this.highlightOverlay)try{let a=document.querySelector(o);if(!a)return void this.clearHighlight();let l=a.getBoundingClientRect();Object.assign(this.highlightOverlay.style,{display:"block",top:`${l.top}px`,left:`${l.left}px`,width:`${l.width}px`,height:`${l.height}px`})}catch{this.clearHighlight()}}clearHighlight(){this.highlightOverlay&&(this.highlightOverlay.style.display="none")}destroy(){this.highlightOverlay&&this.highlightOverlay.parentNode&&this.highlightOverlay.parentNode.removeChild(this.highlightOverlay),this.highlightOverlay=null}};let x=0;let le=class le extends P{constructor(){super(...arguments),this.entries=[],this.history=[],this.maxHistory=100}addEntry(o,a){let l={id:++x,type:o,content:a,timestamp:Date.now()};return this.entries.push(l),this.emit("entry",l),l}execute(o){if(o.trim()){this.addEntry("input",o),this.history.push(o),this.history.length>this.maxHistory&&this.history.shift();try{let a=(0,eval)(o);this.addEntry("output",this.formatResult(a))}catch(a){let o=a instanceof Error?a.message:String(a);this.addEntry("error",o)}}}formatResult(o){if(void 0===o)return"undefined";if(null===o)return"null";if("function"==typeof o)return`ƒ ${o.name||"anonymous"}()`;if("symbol"==typeof o)return o.toString();if(o instanceof Error)return`${o.name}: ${o.message}`;if(o instanceof HTMLElement)return`<${o.tagName.toLowerCase()}>`;if(o instanceof NodeList)return`NodeList(${o.length})`;if("object"==typeof o)try{return JSON.stringify(o,null,2)}catch{}return String(o)}getEntries(){return this.entries}getHistory(){return this.history}clear(){this.entries.length=0,this.emit("clear")}destroy(){this.removeAllListeners()}};let de=class de{constructor(o,a,l){this.container=o,this.onClick=a,this.cleanups=[],this.isDragging=!1,this.dragStarted=!1,this.startX=0,this.startY=0,this.offsetX=0,this.offsetY=0,this.currentX=0,this.currentY=0,this.snapTimer=null,this.el=document.createElement("button"),this.el.className="nc-float-btn",this.el.textContent="NC",this.el.setAttribute("aria-label","Toggle NextConsole");let c=l?.x??window.innerWidth-64,d=l?.y??window.innerHeight-100;this.setPosition(c,d),o.appendChild(this.el),this.bindEvents()}setPosition(o,a){let l=window.innerWidth-48,c=window.innerHeight-48;this.currentX=R(o,0,l),this.currentY=R(a,0,c),this.el.style.left=`${this.currentX}px`,this.el.style.top=`${this.currentY}px`}bindEvents(){this.cleanups.push(v(this.el,"touchstart",o=>{o.preventDefault(),this.isDragging=!0,this.dragStarted=!1;let a=o.touches[0];this.startX=a.clientX,this.startY=a.clientY,this.offsetX=this.el.offsetLeft,this.offsetY=this.el.offsetTop},{passive:!1})),this.cleanups.push(v(window,"touchmove",o=>{if(!this.isDragging)return;let a=o.touches[0],l=a.clientX-this.startX,c=a.clientY-this.startY;!this.dragStarted&&Math.abs(l)+Math.abs(c)>5&&(this.dragStarted=!0),this.dragStarted&&this.setPosition(this.offsetX+l,this.offsetY+c)},{passive:!0})),this.cleanups.push(v(window,"touchend",()=>{this.isDragging&&(this.dragStarted?this.snapToEdge():this.onClick(),this.isDragging=!1,this.dragStarted=!1)})),this.cleanups.push(v(this.el,"mousedown",o=>{o.preventDefault(),this.isDragging=!0,this.dragStarted=!1,this.startX=o.clientX,this.startY=o.clientY,this.offsetX=this.el.offsetLeft,this.offsetY=this.el.offsetTop})),this.cleanups.push(v(window,"mousemove",o=>{if(!this.isDragging)return;let a=o.clientX-this.startX,l=o.clientY-this.startY;!this.dragStarted&&Math.abs(a)+Math.abs(l)>5&&(this.dragStarted=!0),this.dragStarted&&this.setPosition(this.offsetX+a,this.offsetY+l)})),this.cleanups.push(v(window,"mouseup",()=>{this.isDragging&&(this.dragStarted?this.snapToEdge():this.onClick(),this.isDragging=!1,this.dragStarted=!1)}));let e=()=>{this.setPosition(this.currentX,this.currentY)};this.cleanups.push(v(window,"resize",e),v(window,"orientationchange",e))}snapToEdge(){let o=R(this.el.offsetLeft<window.innerWidth/2?8:window.innerWidth-56,0,window.innerWidth-48);this.currentX=o,this.el.style.transition="left 0.2s ease",this.el.style.left=`${o}px`,null!==this.snapTimer&&clearTimeout(this.snapTimer),this.snapTimer=setTimeout(()=>{this.el.style.transition="",this.snapTimer=null},200)}show(){this.el.style.display="flex"}hide(){this.el.style.display="none"}destroy(){null!==this.snapTimer&&(clearTimeout(this.snapTimer),this.snapTimer=null),this.cleanups.forEach(o=>o()),this.cleanups.length=0,this.el.remove()}};let w={key:"#9cdcfe",string:"#ce9178",number:"#b5cea8",boolean:"#569cd6",null:"#569cd6",bracket:"#d4d4d4",comma:"#d4d4d4"};function H(o,a=4){let l=new WeakSet;function n(o,c){if(c>a)return s("string",'"[...]"');if(null===o)return s("null","null");if(void 0===o)return s("null","undefined");let d=typeof o;if("string"===d)return s("string",`"${h(o)}"`);if("number"===d||"bigint"===d)return s("number",String(o));if("boolean"===d)return s("boolean",String(o));if("function"===d)return s("string",`"ƒ ${o.name||"anonymous"}()"`);if("symbol"===d)return s("string",`"${String(o)}"`);if("object"==typeof o){if(l.has(o))return s("string",'"[Circular]"');if(l.add(o),Array.isArray(o)){if(0===o.length)return s("bracket","[]");let a=o.map(o=>n(o,c+1)).join(s("comma",", "));return s("bracket","[")+a+s("bracket","]")}let a=Object.keys(o);if(0===a.length)return s("bracket","{}");let d=a.slice(0,100).map(a=>{let l=s("key",`"${h(a)}"`),d=n(o[a],c+1);return`${l}: ${d}`}).join(s("comma",", ")),p=a.length>100?s("comma",`, ... +${a.length-100}`):"";return s("bracket","{")+d+p+s("bracket","}")}return s("string",h(String(o)))}function s(o,a){return`<span style="color:${w[o]}">${a}</span>`}return n(o,0)}let ue=class ue{constructor(o,a){this.filteredEntries=[],this.activeFilters=new Set,this.searchText="",this.scrollLocked=!0,this.renderRAF=null,this.needsRefresh=!1,this.cleanups=[],this.container=o,this.core=a,this.render(),this.bindEvents()}render(){this.toolbarEl=document.createElement("div"),this.toolbarEl.className="nc-toolbar nc-console-toolbar",this.toolbarEl.innerHTML=`
      <div class="nc-toolbar-group nc-console-filter-group">
        <button class="nc-toolbar-btn" data-nc-filter="log">Log</button>
        <button class="nc-toolbar-btn" data-nc-filter="info">Info</button>
        <button class="nc-toolbar-btn" data-nc-filter="warn">Warn</button>
        <button class="nc-toolbar-btn" data-nc-filter="error">Error</button>
        <button class="nc-toolbar-btn" data-nc-filter="debug">Debug</button>
      </div>
      <input type="text" placeholder="Filter logs..." class="nc-console-search" />
      <div class="nc-toolbar-group nc-console-action-group">
        <button class="nc-toolbar-btn nc-console-clear">Clear</button>
        <button class="nc-toolbar-btn nc-console-export">Export</button>
      </div>
    `,this.container.appendChild(this.toolbarEl),this.listEl=document.createElement("div"),this.listEl.className="nc-console-list",this.container.appendChild(this.listEl),this.refreshEntries()}bindEvents(){let o;this.toolbarEl.addEventListener("click",o=>{let a=o.target.closest("[data-nc-filter]");if(a){let o=a.getAttribute("data-nc-filter");this.activeFilters.has(o)?(this.activeFilters.delete(o),a.classList.remove("nc-active")):(this.activeFilters.add(o),a.classList.add("nc-active")),this.refreshEntries()}});let a=this.toolbarEl.querySelector(".nc-console-search");a.addEventListener("input",()=>{clearTimeout(o),o=setTimeout(()=>{this.searchText=a.value,this.refreshEntries()},150)}),this.toolbarEl.querySelector(".nc-console-clear").addEventListener("click",()=>{this.core.clear()}),this.toolbarEl.querySelector(".nc-console-export").addEventListener("click",()=>{let o=new Blob([this.core.exportJSON()],{type:"application/json"}),a=URL.createObjectURL(o),l=document.createElement("a");l.href=a,l.download=`nextconsole-logs-${Date.now()}.json`,l.click(),URL.revokeObjectURL(a)}),this.listEl.addEventListener("scroll",()=>{let{scrollTop:o,scrollHeight:a,clientHeight:l}=this.listEl;this.scrollLocked=o+l>=a-40});let l=this.core.on("entry",()=>{this.scheduleRefresh()}),c=this.core.on("streamUpdate",()=>{this.scheduleRefresh()}),d=this.core.on("clear",()=>{this.scheduleRefresh()});this.cleanups.push(l,c,d)}scheduleRefresh(){if(!this.isRenderable()){this.needsRefresh=!0;return}null===this.renderRAF&&(this.renderRAF=requestAnimationFrame(()=>{this.renderRAF=null,this.refreshEntries()}))}refresh(){null!==this.renderRAF&&(cancelAnimationFrame(this.renderRAF),this.renderRAF=null),this.needsRefresh=!1,this.refreshEntries()}isRenderable(){return this.container.classList.contains("nc-tab-pane-active")&&null!==this.container.closest(".nc-panel-visible")}refreshEntries(){if(!this.isRenderable()&&this.needsRefresh)return;let o=this.activeFilters.size>0?Array.from(this.activeFilters):void 0;this.filteredEntries=this.core.getFilteredEntries(o,this.searchText||void 0),this.renderList()}renderList(){let o=this.filteredEntries,a=Math.max(0,o.length-500),l="";a>0&&(l+=`<div class="nc-log-entry" style="justify-content:center;color:var(--nc-text-muted);font-size:11px">... 省略了 ${a} 条更早的日志 ...</div>`);for(let c=a;c<o.length;c++){let a=o[c],d=a.streaming?" nc-log-streaming":"";l+=`<div class="nc-log-entry nc-log-level-${a.level}${d}"><span class="nc-log-time">${A(a.timestamp)}</span><span class="nc-log-body">${this.renderArgs(a.args)}</span></div>`}this.listEl.innerHTML=l,this.scrollLocked&&o.length>0&&(this.listEl.scrollTop=this.listEl.scrollHeight)}renderArgs(o){return o.map(o=>"string"==typeof o?h(o):"number"==typeof o||"boolean"==typeof o||null==o?`<span style="color:#b5cea8">${String(o)}</span>`:"object"==typeof o?H(o):h(String(o))).join(" ")}destroy(){null!==this.renderRAF&&cancelAnimationFrame(this.renderRAF),this.cleanups.forEach(o=>o()),this.cleanups.length=0,this.container.innerHTML=""}};let fe=class fe{constructor(o,a){this.tableBody=null,this.detailEl=null,this.selectedId=null,this.sortKey="duration",this.sortDir="desc",this.searchText="",this.renderRAF=null,this.needsRefresh=!1,this.cleanups=[],this.container=o,this.core=a,this.render(),this.bindEvents()}render(){this.container.innerHTML=`
      <div class="nc-toolbar">
        <input type="text" placeholder="Filter requests..." class="nc-network-search" />
        <button class="nc-toolbar-btn nc-network-clear">Clear</button>
      </div>
      <div style="flex:1;overflow:auto;display:flex;flex-direction:column">
        <div style="flex:1;overflow:auto">
          <table class="nc-network-table">
            <thead>
              <tr>
                <th data-nc-sort="method" style="width:60px">Method</th>
                <th data-nc-sort="url">URL</th>
                <th data-nc-sort="status" style="width:60px">Status</th>
                <th data-nc-sort="type" style="width:50px">Type</th>
                <th data-nc-sort="duration" style="width:80px">Time</th>
              </tr>
            </thead>
            <tbody class="nc-network-tbody"></tbody>
          </table>
        </div>
        <div class="nc-network-detail" style="display:none"></div>
      </div>
    `,this.tableBody=this.container.querySelector(".nc-network-tbody"),this.detailEl=this.container.querySelector(".nc-network-detail"),this.refreshTable()}bindEvents(){let o;this.container.querySelectorAll("[data-nc-sort]").forEach(o=>{o.addEventListener("click",()=>{let a=o.dataset.ncSort;this.sortKey===a?this.sortDir="asc"===this.sortDir?"desc":"asc":(this.sortKey=a,this.sortDir="asc"),this.refreshTable()})});let a=this.container.querySelector(".nc-network-search");a.addEventListener("input",()=>{clearTimeout(o),o=setTimeout(()=>{this.searchText=a.value,this.refreshTable()},150)}),this.container.querySelector(".nc-network-clear").addEventListener("click",()=>{this.core.clear(),this.selectedId=null,this.detailEl&&(this.detailEl.style.display="none")}),this.container.addEventListener("click",o=>{let a=o.target.closest("[data-nc-req-id]");a&&(this.selectedId=Number(a.dataset.ncReqId),this.showDetail())});let l=this.core.on("request",()=>this.scheduleRefresh()),c=this.core.on("update",()=>{this.scheduleRefresh(),this.selectedId&&this.isRenderable()&&this.showDetail()}),d=this.core.on("clear",()=>this.scheduleRefresh());this.cleanups.push(l,c,d)}scheduleRefresh(){if(!this.isRenderable()){this.needsRefresh=!0;return}null===this.renderRAF&&(this.renderRAF=requestAnimationFrame(()=>{this.renderRAF=null,this.refreshTable()}))}refresh(){null!==this.renderRAF&&(cancelAnimationFrame(this.renderRAF),this.renderRAF=null),this.needsRefresh=!1,this.refreshTable(),this.selectedId&&this.showDetail()}isRenderable(){return this.container.classList.contains("nc-tab-pane-active")&&null!==this.container.closest(".nc-panel-visible")}refreshTable(){if(!this.tableBody)return;let o=this.core.getEntries().slice();if(this.searchText){let a=this.searchText.toLowerCase();o=o.filter(o=>o.url.toLowerCase().includes(a))}o.sort((o,a)=>{let l="",c="";switch(this.sortKey){case"url":l=o.url,c=a.url;break;case"method":l=o.method,c=a.method;break;case"status":l=o.status,c=a.status;break;case"type":l=o.type,c=a.type;break;case"duration":l=o.duration,c=a.duration}if("string"==typeof l){let o=l.localeCompare(c);return"asc"===this.sortDir?o:-o}return"asc"===this.sortDir?l-c:c-l});let a="";for(let l of o){let o=l.pending?"nc-status-pending":l.status>=400?"nc-status-err":"nc-status-ok",c=l.pending?"⏳":String(l.status),d=l.url.length>80?l.url.slice(0,80)+"…":l.url,p=l.messages&&l.messages.length>0?` (${l.messages.length})`:"";a+=`<tr data-nc-req-id="${l.id}"><td>${h(l.method)}</td><td title="${h(l.url)}">${h(d)}</td><td class="${o}">${c}</td><td>${l.type}${p}</td><td>${l.pending?"sse"===l.type||"websocket"===l.type?"●":"-":q(l.duration)}</td></tr>`}this.tableBody.innerHTML=a}showDetail(){if(!this.detailEl||!this.selectedId)return;let o=this.core.getEntries().find(o=>o.id===this.selectedId);if(!o){this.detailEl.style.display="none";return}this.detailEl.style.display="block";let a="";if(a+='<div class="nc-detail-section">',a+='<div class="nc-detail-title">General</div>',a+='<div class="nc-detail-body">',a+=`URL: ${h(o.url)}
`,a+=`Method: ${o.method}
`,a+=`Status: ${o.status} ${h(o.statusText)}
`,a+=`Type: ${o.type}
`,a+=`Duration: ${o.pending?"pending...":q(o.duration)}
`,o.messages&&(a+=`Messages: ${o.messages.length}
`),o.error&&(a+=`Error: ${h(o.error)}
`),a+="</div></div>",o.messages&&o.messages.length>0){a+='<div class="nc-detail-section">',a+=`<div class="nc-detail-title">Messages (${o.messages.length})${o.pending?' \xb7 <span style="color:#3dc9b0">● Live</span>':""}</div>`,a+='<div class="nc-detail-body nc-messages-stream">';let l=o.messages.slice(-100);for(let c of(o.messages.length>100&&(a+=`<div class="nc-msg-row nc-msg-info">... ${o.messages.length-100} earlier messages hidden</div>`),l)){let o="out"===c.direction?"nc-msg-out":"nc-msg-in",l="out"===c.direction?"↑":"↓",d=null!=c.size?` \xb7 ${this.formatSize(c.size)}`:"",p=c.event?` [${h(c.event)}]`:"";a+=`<div class="nc-msg-row ${o}">`,a+=`<span class="nc-msg-arrow">${l}</span>`,a+=`<span class="nc-msg-time">${A(c.timestamp)}</span>`,a+=`<span class="nc-msg-event">${p}</span>`,a+=`<span class="nc-msg-data">${this.formatMsgData(c.data)}</span>`,a+=`<span class="nc-msg-size">${d}</span>`,a+="</div>"}a+="</div></div>"}a+=this.renderHeaders("Request Headers",o.requestHeaders),a+=this.renderHeaders("Response Headers",o.responseHeaders),o.requestBody&&(a+='<div class="nc-detail-section">',a+='<div class="nc-detail-title">Request Body</div>',a+=`<div class="nc-detail-body">${H(o.requestBody)}</div>`,a+="</div>"),o.responseBody&&(a+='<div class="nc-detail-section">',a+='<div class="nc-detail-title">Response Body</div>',a+=`<div class="nc-detail-body">${H(o.responseBody)}</div>`,a+="</div>"),this.detailEl.innerHTML=a;let l=this.detailEl.querySelector(".nc-messages-stream");l&&(l.scrollTop=l.scrollHeight)}formatMsgData(o){try{let a=JSON.parse(o);return H(a)}catch{return h(o)}}formatSize(o){return o<1024?`${o} B`:`${(o/1024).toFixed(1)} KB`}renderHeaders(o,a){let l=Object.keys(a);if(0===l.length)return"";let c='<div class="nc-detail-section">';for(let d of(c+=`<div class="nc-detail-title">${o}</div><div class="nc-detail-body">`,l))c+=`${h(d)}: ${h(a[d])}
`;return c+"</div></div>"}destroy(){null!==this.renderRAF&&cancelAnimationFrame(this.renderRAF),this.cleanups.forEach(o=>o()),this.cleanups.length=0,this.container.innerHTML=""}};let ge=class ge{constructor(o,a){this.tableBody=null,this.searchText="",this.activeType="all",this.cleanups=[],this.currentEntries=[],this.container=o,this.core=a,this.render(),this.bindEvents()}render(){this.container.innerHTML=`
      <div class="nc-toolbar">
        <button class="nc-toolbar-btn nc-active" data-nc-stype="all">All</button>
        <button class="nc-toolbar-btn" data-nc-stype="localStorage">Local</button>
        <button class="nc-toolbar-btn" data-nc-stype="sessionStorage">Session</button>
        <button class="nc-toolbar-btn" data-nc-stype="cookie">Cookie</button>
        <input type="text" placeholder="Filter keys..." class="nc-storage-search" />
        <button class="nc-toolbar-btn nc-storage-add">+ Add</button>
        <button class="nc-toolbar-btn nc-storage-refresh">↻</button>
      </div>
      <div style="flex:1;overflow:auto">
        <table class="nc-storage-table">
          <thead>
            <tr>
              <th style="width:25%">Key</th>
              <th>Value</th>
              <th style="width:auto">Type</th>
              <th style="width:1%">Actions</th>
            </tr>
          </thead>
          <tbody class="nc-storage-tbody"></tbody>
        </table>
      </div>
    `,this.tableBody=this.container.querySelector(".nc-storage-tbody"),this.refreshTable()}bindEvents(){let o;this.container.addEventListener("click",o=>{let a=o.target.closest("[data-nc-stype]");a&&(this.activeType=a.dataset.ncStype,this.container.querySelectorAll("[data-nc-stype]").forEach(o=>o.classList.remove("nc-active")),a.classList.add("nc-active"),this.refreshTable())});let a=this.container.querySelector(".nc-storage-search");a.addEventListener("input",()=>{clearTimeout(o),o=setTimeout(()=>{this.searchText=a.value,this.refreshTable()},150)}),this.container.querySelector(".nc-storage-add").addEventListener("click",()=>{this.showAddDialog()}),this.container.querySelector(".nc-storage-refresh").addEventListener("click",()=>{this.refreshTable()}),this.container.addEventListener("click",o=>{let a=o.target;if("edit"===a.dataset.ncAction){let o=a.dataset.ncKey,l=a.dataset.ncType;this.showEditDialog(l,o);return}if("delete"===a.dataset.ncAction){let o=a.dataset.ncKey,l=a.dataset.ncType;this.core.removeItem(l,o),this.refreshTable();return}let l=a.closest("tr[data-nc-row]");if(l&&!a.closest(".nc-storage-actions")){let o=l.nextElementSibling;if(o&&o.classList.contains("nc-storage-detail"))l.classList.remove("nc-storage-expanded"),o.remove();else{this.tableBody?.querySelectorAll(".nc-storage-detail").forEach(o=>{o.previousElementSibling?.classList.remove("nc-storage-expanded"),o.remove()}),l.classList.add("nc-storage-expanded");let o=parseInt(l.dataset.ncIdx||"0",10),a=this.currentEntries[o]?.value||"",c=document.createElement("tr");c.className="nc-storage-detail",c.innerHTML=`<td colspan="4">${h(a)}</td>`,l.after(c)}}});let l=this.core.on("update",()=>this.refreshTable());this.cleanups.push(l)}refreshTable(){if(!this.tableBody)return;let o=this.core.getEntries(this.searchText||void 0);"all"!==this.activeType&&(o=o.filter(o=>o.type===this.activeType)),this.currentEntries=o;let a="";for(let l=0;l<o.length;l++){let c=o[l],d=c.value.length>60?c.value.slice(0,60)+"…":c.value;a+=`<tr data-nc-row data-nc-idx="${l}" style="cursor:pointer"><td>${h(c.key)}</td><td>${h(d)}</td><td class="nc-storage-type">${c.type}</td><td class="nc-storage-actions"><button data-nc-action="edit" data-nc-key="${h(c.key)}" data-nc-type="${c.type}">Edit</button><button class="nc-danger" data-nc-action="delete" data-nc-key="${h(c.key)}" data-nc-type="${c.type}">Del</button></td></tr>`}0===o.length&&(a='<tr><td colspan="4" style="text-align:center;color:#666;padding:20px">No entries found</td></tr>'),this.tableBody.innerHTML=a}showAddDialog(){this.showModal("Add Entry",{type:"all"!==this.activeType?this.activeType:"localStorage",key:"",value:""},o=>{this.core.setItem(o.type,o.key,o.value),this.refreshTable()})}showEditDialog(o,a){let l=this.core.getEntries().find(l=>l.type===o&&l.key===a);l&&this.showModal("Edit Entry",{type:l.type,key:l.key,value:l.value},l=>{let c=l.type;c!==o||l.key!==a?this.core.setItem(c,l.key,l.value)&&this.core.removeItem(o,a):this.core.setItem(c,l.key,l.value),this.refreshTable()})}showModal(o,a,l){let c=document.createElement("div");c.className="nc-modal-overlay",c.innerHTML=`
      <div class="nc-modal">
        <h3>${h(o)}</h3>
        <label>Type</label>
        <select class="nc-modal-type">
          <option value="localStorage" ${"localStorage"===a.type?"selected":""}>localStorage</option>
          <option value="sessionStorage" ${"sessionStorage"===a.type?"selected":""}>sessionStorage</option>
          <option value="cookie" ${"cookie"===a.type?"selected":""}>cookie</option>
        </select>
        <label>Key</label>
        <input type="text" class="nc-modal-key" value="${h(a.key)}" />
        <label>Value</label>
        <textarea class="nc-modal-value" rows="3">${h(a.value)}</textarea>
        <div class="nc-modal-btns">
          <button class="nc-modal-cancel">Cancel</button>
          <button class="nc-primary nc-modal-save">Save</button>
        </div>
      </div>
    `,this.container.appendChild(c),c.querySelector(".nc-modal-cancel").addEventListener("click",()=>{c.remove()}),c.querySelector(".nc-modal-save").addEventListener("click",()=>{let o=c.querySelector(".nc-modal-type").value,a=c.querySelector(".nc-modal-key").value,d=c.querySelector(".nc-modal-value").value;a&&l({type:o,key:a,value:d}),c.remove()}),c.addEventListener("click",o=>{o.target===c&&c.remove()})}destroy(){this.cleanups.forEach(o=>o()),this.cleanups.length=0,this.container.innerHTML=""}};let me=class me{constructor(o,a){this.container=o,this.core=a,this.render(),this.bindEvents()}render(){this.container.innerHTML=`
      <div class="nc-toolbar">
        <button class="nc-toolbar-btn nc-element-refresh">↻ Refresh</button>
      </div>
      <div class="nc-element-tree"></div>
    `,this.treeEl=this.container.querySelector(".nc-element-tree"),this.refreshTree()}refreshTree(){this.treeEl.innerHTML=this.core.renderTree(document.documentElement,6)}bindEvents(){this.container.querySelector(".nc-element-refresh").addEventListener("click",()=>{this.refreshTree()}),this.treeEl.addEventListener("click",o=>{let a=o.target.closest("[data-nc-toggle]");if(a){let o=a.dataset.ncToggle,l=this.treeEl.querySelector(`#${o}`);if(l){let o="none"!==l.style.display;l.style.display=o?"none":"block",a.textContent=o?"▶":"▼",a.classList.toggle("nc-expanded",!o)}}}),this.treeEl.addEventListener("mouseover",o=>{let a=o.target.closest("[data-nc-highlight]");if(a){let o=a.dataset.ncHighlight;this.core.highlight(o)}}),this.treeEl.addEventListener("mouseout",()=>{this.core.clearHighlight()})}destroy(){this.core.clearHighlight(),this.container.innerHTML=""}};function be(){let o=navigator,a={userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,screenWidth:screen.width,screenHeight:screen.height,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,devicePixelRatio:window.devicePixelRatio};return o.deviceMemory&&(a.deviceMemory=o.deviceMemory),o.hardwareConcurrency&&(a.hardwareConcurrency=o.hardwareConcurrency),o.connection&&(a.connectionType=o.connection.effectiveType||o.connection.type),a.performance=ve(),a}function ve(){if(typeof performance>"u")return;let o={};try{let a=performance.getEntriesByType("navigation");if(a.length>0){let l=a[0];l.loadEventEnd>0&&(o.pageLoadTime=Math.round(l.loadEventEnd-l.startTime)),l.domContentLoadedEventEnd>0&&(o.domContentLoaded=Math.round(l.domContentLoadedEventEnd-l.startTime))}}catch{}try{for(let a of performance.getEntriesByType("paint"))"first-paint"===a.name&&(o.firstPaint=Math.round(a.startTime)),"first-contentful-paint"===a.name&&(o.firstContentfulPaint=Math.round(a.startTime))}catch{}let a=performance;return a.memory&&(o.usedJSHeapSize=a.memory.usedJSHeapSize,o.totalJSHeapSize=a.memory.totalJSHeapSize),o}let ye=class ye{constructor(o){this.container=o,this.render()}render(){this.container.innerHTML=`
      <div class="nc-toolbar">
        <button class="nc-toolbar-btn nc-system-refresh">↻ Refresh</button>
      </div>
      <div class="nc-system-list"></div>
    `,this.container.querySelector(".nc-system-refresh").addEventListener("click",()=>{this.refreshInfo()}),this.refreshInfo()}refreshInfo(){let o=be(),a=this.container.querySelector(".nc-system-list"),l=[["User Agent",o.userAgent],["Platform",o.platform],["Language",o.language],["Screen",`${o.screenWidth} \xd7 ${o.screenHeight}`],["Viewport",`${o.viewportWidth} \xd7 ${o.viewportHeight}`],["Device Pixel Ratio",String(o.devicePixelRatio)]];if(void 0!==o.deviceMemory&&l.push(["Device Memory",`${o.deviceMemory} GB`]),void 0!==o.hardwareConcurrency&&l.push(["CPU Cores",String(o.hardwareConcurrency)]),o.connectionType&&l.push(["Network Type",o.connectionType]),o.performance){let a=o.performance;void 0!==a.pageLoadTime&&l.push(["Page Load",`${a.pageLoadTime}ms`]),void 0!==a.domContentLoaded&&l.push(["DOM Content Loaded",`${a.domContentLoaded}ms`]),void 0!==a.firstPaint&&l.push(["First Paint",`${a.firstPaint}ms`]),void 0!==a.firstContentfulPaint&&l.push(["First Contentful Paint",`${a.firstContentfulPaint}ms`]),void 0!==a.usedJSHeapSize&&l.push(["JS Heap Used",`${(a.usedJSHeapSize/1048576).toFixed(1)} MB`]),void 0!==a.totalJSHeapSize&&l.push(["JS Heap Total",`${(a.totalJSHeapSize/1048576).toFixed(1)} MB`])}let c="";for(let[o,a]of l)c+=`<div class="nc-system-row"><div class="nc-system-key">${h(o)}</div><div class="nc-system-val">${h(a)}</div></div>`;a.innerHTML=c}destroy(){this.container.innerHTML=""}};let xe=class xe{constructor(o,a){this.historyIndex=-1,this.currentInput="",this.cleanups=[],this.container=o,this.core=a,this.render(),this.bindEvents()}render(){for(let o of(this.container.innerHTML=`
      <div class="nc-toolbar">
        <button class="nc-toolbar-btn nc-repl-clear">Clear</button>
      </div>
      <div class="nc-repl-output"></div>
      <div class="nc-repl-input-wrap">
        <span class="nc-repl-prompt">&gt;</span>
        <textarea class="nc-repl-input" rows="1" placeholder="Enter JavaScript..." spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
        <button class="nc-repl-run">Run</button>
      </div>
    `,this.outputEl=this.container.querySelector(".nc-repl-output"),this.inputEl=this.container.querySelector(".nc-repl-input"),this.core.getEntries()))this.appendEntry(o)}bindEvents(){this.container.querySelector(".nc-repl-run").addEventListener("click",()=>{this.executeInput()}),this.container.querySelector(".nc-repl-clear").addEventListener("click",()=>{this.core.clear()}),this.inputEl.addEventListener("keydown",o=>{"Enter"!==o.key||o.shiftKey?"ArrowUp"===o.key&&0===this.inputEl.selectionStart?(o.preventDefault(),this.navigateHistory(-1)):"ArrowDown"===o.key&&(o.preventDefault(),this.navigateHistory(1)):(o.preventDefault(),this.executeInput())}),this.inputEl.addEventListener("input",()=>{this.autoResize()});let o=this.core.on("entry",o=>{this.appendEntry(o)}),a=this.core.on("clear",()=>{this.outputEl.innerHTML=""});this.cleanups.push(o,a)}executeInput(){let o=this.inputEl.value.trim();o&&(this.historyIndex=-1,this.currentInput="",this.inputEl.value="",this.autoResize(),this.core.execute(o))}navigateHistory(o){let a=this.core.getHistory();if(0===a.length)return;-1===this.historyIndex&&(this.currentInput=this.inputEl.value);let l=this.historyIndex+o;if(o<0){let o=-1===this.historyIndex?a.length-1:Math.max(0,l);this.historyIndex=o,this.inputEl.value=a[a.length-1-this.historyIndex]||""}else this.historyIndex<=0?(this.historyIndex=-1,this.inputEl.value=this.currentInput):(this.historyIndex=l,this.inputEl.value=a[a.length-1-this.historyIndex]||"");this.autoResize()}appendEntry(o){let a=document.createElement("div");a.className=`nc-repl-row nc-repl-${o.type}`;let l=`<span class="nc-log-time">${A(o.timestamp)}</span>`;if("input"===o.type)a.innerHTML=`${l}<span class="nc-repl-prompt">&gt;</span><span class="nc-repl-code">${h(o.content)}</span>`;else if("error"===o.type)a.innerHTML=`${l}<span class="nc-repl-result nc-repl-err">${h(o.content)}</span>`;else{let c;try{let a=JSON.parse(o.content);c=H(a)}catch{c=h(o.content)}a.innerHTML=`${l}<span class="nc-repl-result">${c}</span>`}this.outputEl.appendChild(a),this.outputEl.scrollTop=this.outputEl.scrollHeight}autoResize(){this.inputEl.style.height="auto",this.inputEl.style.height=`${Math.min(this.inputEl.scrollHeight,120)}px`}destroy(){this.cleanups.forEach(o=>o()),this.cleanups.length=0,this.container.innerHTML=""}};let k=`
:host {
  --nc-bg: #1e1e1e;
  --nc-bg-secondary: #252526;
  --nc-bg-hover: #2a2d2e;
  --nc-bg-active: #37373d;
  --nc-border: #3c3c3c;
  --nc-text: #cccccc;
  --nc-text-secondary: #999999;
  --nc-text-muted: #666666;
  --nc-accent: #0078d4;
  --nc-accent-hover: #1a8cff;
  --nc-log: #d4d4d4;
  --nc-info: #3dc9b0;
  --nc-warn: #cca700;
  --nc-error: #f14c4c;
  --nc-debug: #9cdcfe;
  --nc-font: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  --nc-font-size: 12px;
  --nc-radius: 4px;
  --nc-panel-height: 40vh;
  --nc-btn-size: 48px;
  --nc-shadow: 0 2px 8px rgba(0,0,0,0.4);
  --nc-modal-overlay: rgba(0,0,0,0.5);
  --nc-scrollbar-hover: #555;

  font-family: var(--nc-font);
  font-size: var(--nc-font-size);
  color: var(--nc-text);
  line-height: 1.5;
}

/* Light Theme */
:host(.nc-theme-light) {
  --nc-bg: #ffffff;
  --nc-bg-secondary: #f5f5f5;
  --nc-bg-hover: #e8e8e8;
  --nc-bg-active: #dcdcdc;
  --nc-border: #d4d4d4;
  --nc-text: #1e1e1e;
  --nc-text-secondary: #616161;
  --nc-text-muted: #9e9e9e;
  --nc-accent: #0066cc;
  --nc-accent-hover: #0055aa;
  --nc-log: #333333;
  --nc-info: #098658;
  --nc-warn: #9d6e00;
  --nc-error: #cd3131;
  --nc-debug: #0451a5;
  --nc-shadow: 0 2px 12px rgba(0,0,0,0.15);
  --nc-modal-overlay: rgba(0,0,0,0.3);
  --nc-scrollbar-hover: #aaa;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Float Button */
.nc-float-btn {
  position: fixed;
  z-index: 2147483647;
  width: var(--nc-btn-size);
  height: var(--nc-btn-size);
  border-radius: 50%;
  background: var(--nc-accent);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  font-family: var(--nc-font);
  box-shadow: var(--nc-shadow);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background 0.2s;
}
.nc-float-btn:active {
  background: var(--nc-accent-hover);
}

/* Panel Container */
.nc-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483645;
  display: none;
  background: transparent;
}
.nc-backdrop.nc-backdrop-visible {
  display: block;
}
.nc-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nc-panel-height);
  z-index: 2147483646;
  background: var(--nc-bg);
  border-top: 1px solid var(--nc-border);
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.25s ease;
}
.nc-panel.nc-panel-visible {
  transform: translateY(0);
}

/* Resize Handle */
.nc-resize-handle {
  height: 6px;
  cursor: ns-resize;
  background: var(--nc-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nc-resize-handle::after {
  content: '';
  width: 32px;
  height: 3px;
  background: var(--nc-border);
  border-radius: 2px;
}

/* Tab Bar */
.nc-tab-bar {
  display: flex;
  flex-direction: row;
  background: var(--nc-bg-secondary);
  border-bottom: 1px solid var(--nc-border);
  flex-shrink: 0;
  align-items: stretch;
  position: relative;
}
.nc-tab-bar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 18px;
  pointer-events: none;
  background: linear-gradient(to right, rgba(37,37,38,0), var(--nc-bg-secondary));
}
.nc-tabs-scroll {
  display: flex;
  flex: 1;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  order: 1;
}
.nc-tab {
  padding: 8px 14px;
  cursor: pointer;
  color: var(--nc-text-secondary);
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  font-size: 12px;
  font-family: var(--nc-font);
  transition: color 0.15s, border-color 0.15s;
  user-select: none;
  -webkit-user-select: none;
  flex-shrink: 0;
}
.nc-close-btn {
  width: 44px;
  min-width: 44px;
  min-height: 36px;
  padding: 0;
  cursor: pointer;
  color: var(--nc-text);
  font-size: 16px;
  font-family: var(--nc-font);
  background: var(--nc-bg-secondary);
  border: none;
  border-right: 1px solid var(--nc-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  order: 0;
}
.nc-close-btn:hover {
  color: var(--nc-error);
}
.nc-tab:hover {
  color: var(--nc-text);
}
.nc-tab.nc-tab-active {
  color: var(--nc-accent);
  border-bottom-color: var(--nc-accent);
}

/* Tab Content */
.nc-tab-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.nc-tab-pane {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  overflow: auto;
  display: none;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
}
.nc-tab-pane.nc-tab-pane-active {
  display: flex;
}

/* Toolbar */
.nc-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--nc-bg-secondary);
  border-bottom: 1px solid var(--nc-border);
  flex-shrink: 0;
}
.nc-toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-shrink: 0;
}
.nc-console-toolbar {
  flex-wrap: wrap;
  row-gap: 4px;
}
.nc-console-filter-group {
  flex-wrap: wrap;
}
.nc-console-action-group {
  margin-left: auto;
}
.nc-toolbar input[type="text"] {
  flex: 1;
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  color: var(--nc-text);
  padding: 3px 8px;
  border-radius: var(--nc-radius);
  font-size: 11px;
  font-family: var(--nc-font);
  outline: none;
  min-width: 0;
}
.nc-toolbar input[type="text"]:focus {
  border-color: var(--nc-accent);
}
.nc-console-toolbar input.nc-console-search {
  flex: 1 1 180px;
  min-width: 140px;
}
.nc-toolbar-btn {
  padding: 3px 8px;
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  color: var(--nc-text-secondary);
  cursor: pointer;
  border-radius: var(--nc-radius);
  font-size: 11px;
  font-family: var(--nc-font);
  white-space: nowrap;
  transition: background 0.15s;
}
.nc-toolbar-btn:hover {
  background: var(--nc-bg-hover);
  color: var(--nc-text);
}
.nc-toolbar-btn.nc-active {
  background: var(--nc-accent);
  color: #fff;
  border-color: var(--nc-accent);
}

/* Console Panel */
.nc-console-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
.nc-log-entry {
  padding: 4px 8px;
  border-bottom: 1px solid var(--nc-border);
  font-family: var(--nc-font);
  font-size: var(--nc-font-size);
  word-break: break-all;
  white-space: pre-wrap;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}
.nc-log-entry:hover {
  background: var(--nc-bg-hover);
}
.nc-log-time {
  color: var(--nc-text-muted);
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1.4;
  padding-top: 1px;
}
.nc-log-body {
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
}
.nc-log-level-log .nc-log-body { color: var(--nc-log); }
.nc-log-level-info .nc-log-body { color: var(--nc-info); }
.nc-log-level-warn .nc-log-body { color: var(--nc-warn); }
.nc-log-level-error .nc-log-body { color: var(--nc-error); }
.nc-log-level-debug .nc-log-body { color: var(--nc-debug); }
.nc-log-level-warn { background: rgba(204, 167, 0, 0.08); }
.nc-log-level-error { background: rgba(241, 76, 76, 0.08); }
.nc-log-streaming {
  border-left: 2px solid var(--nc-accent);
}

/* Network Panel */
.nc-network-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
}
.nc-network-table th {
  position: sticky;
  top: 0;
  background: var(--nc-bg-secondary);
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--nc-border);
  color: var(--nc-text-secondary);
  font-weight: normal;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.nc-network-table th:hover {
  color: var(--nc-text);
}
.nc-network-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--nc-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nc-network-table tr:hover td {
  background: var(--nc-bg-hover);
}
.nc-network-table .nc-status-ok { color: var(--nc-info); }
.nc-network-table .nc-status-err { color: var(--nc-error); }
.nc-network-table .nc-status-pending { color: var(--nc-warn); }

.nc-network-detail {
  padding: 8px;
  border-top: 1px solid var(--nc-border);
  background: var(--nc-bg-secondary);
  overflow: auto;
  max-height: 50%;
}
.nc-detail-section {
  margin-bottom: 8px;
}
.nc-detail-title {
  color: var(--nc-text-secondary);
  font-weight: bold;
  margin-bottom: 4px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.nc-detail-body {
  padding-left: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Messages Stream (SSE/WebSocket) */
.nc-messages-stream {
  max-height: 200px;
  overflow-y: auto;
  padding: 0 !important;
  white-space: normal !important;
}
.nc-msg-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 8px;
  border-bottom: 1px solid var(--nc-border);
  font-size: 11px;
  line-height: 1.4;
}
.nc-msg-row:hover {
  background: var(--nc-bg-hover);
}
.nc-msg-out {
  color: #e07b39;
}
.nc-msg-in {
  color: #3dc9b0;
}
.nc-msg-info {
  color: var(--nc-text-secondary);
  font-style: italic;
  justify-content: center;
}
.nc-msg-arrow {
  flex-shrink: 0;
  font-weight: bold;
  width: 12px;
}
.nc-msg-time {
  flex-shrink: 0;
  color: var(--nc-text-secondary);
  font-size: 10px;
  min-width: 70px;
}
.nc-msg-event {
  flex-shrink: 0;
  color: #a78bfa;
  font-size: 10px;
}
.nc-msg-data {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
}
.nc-msg-size {
  flex-shrink: 0;
  color: var(--nc-text-secondary);
  font-size: 10px;
}

/* Storage Panel */
.nc-storage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.nc-storage-table th {
  position: sticky;
  top: 0;
  background: var(--nc-bg-secondary);
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--nc-border);
  color: var(--nc-text-secondary);
  font-weight: normal;
}
.nc-storage-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--nc-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nc-storage-table td.nc-storage-type {
  white-space: nowrap;
  overflow: visible;
}
.nc-storage-table td:last-child {
  overflow: visible;
  white-space: nowrap;
  width: 1%;
}
.nc-storage-table tr:hover td {
  background: var(--nc-bg-hover);
}
.nc-storage-table tr:hover td:last-child {
  background: transparent;
}
.nc-storage-table tr.nc-storage-expanded td {
  border-bottom: none;
}
.nc-storage-detail {
  background: var(--nc-bg-secondary);
  border-bottom: 1px solid var(--nc-border);
}
.nc-storage-detail td {
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-all;
  max-width: none;
  overflow: visible;
  color: var(--nc-text);
  font-size: 11px;
  line-height: 1.5;
}
.nc-storage-actions {
  display: flex;
  gap: 4px;
}
.nc-storage-actions button {
  padding: 1px 6px;
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  color: var(--nc-text-secondary);
  cursor: pointer;
  border-radius: 2px;
  font-size: 10px;
  font-family: var(--nc-font);
  position: relative;
  z-index: 1;
}
.nc-storage-actions button:hover {
  background: var(--nc-bg-hover);
  color: var(--nc-text);
}
.nc-storage-actions button.nc-danger:hover {
  color: var(--nc-error);
  border-color: var(--nc-error);
}

/* Element Panel */
.nc-element-tree {
  padding: 8px;
  font-size: 12px;
  overflow: auto;
  height: 100%;
}
.nc-dom-node {
  line-height: 1.6;
  cursor: default;
}
.nc-dom-tag { color: #569cd6; }
.nc-dom-attr { color: #9cdcfe; }
.nc-dom-attr-val { color: #ce9178; }
.nc-dom-text { color: #d4d4d4; }
:host(.nc-theme-light) .nc-dom-tag { color: #0000ff; }
:host(.nc-theme-light) .nc-dom-attr { color: #e50000; }
:host(.nc-theme-light) .nc-dom-attr-val { color: #a31515; }
:host(.nc-theme-light) .nc-dom-text { color: #333333; }
:host(.nc-theme-light) .nc-log-level-warn { background: rgba(157, 110, 0, 0.08); }
:host(.nc-theme-light) .nc-log-level-error { background: rgba(205, 49, 49, 0.08); }
:host(.nc-theme-light) .nc-msg-out { color: #c05717; }
:host(.nc-theme-light) .nc-msg-in { color: #098658; }
:host(.nc-theme-light) .nc-msg-event { color: #6f42c1; }
.nc-dom-toggle {
  cursor: pointer;
  display: inline-block;
  width: 12px;
  font-size: 10px;
  transition: transform 0.15s;
}
.nc-dom-toggle.nc-expanded {
  transform: rotate(90deg);
}

/* System Panel */
.nc-system-list {
  padding: 8px;
}
.nc-system-row {
  display: flex;
  padding: 4px 0;
  border-bottom: 1px solid var(--nc-border);
}
.nc-system-key {
  width: 200px;
  flex-shrink: 0;
  color: var(--nc-text-secondary);
}
.nc-system-val {
  flex: 1;
  word-break: break-all;
  min-width: 0;
}

@media (max-width: 480px) {
  .nc-toolbar {
    padding: 4px 6px;
  }
  .nc-toolbar-btn {
    padding-left: 7px;
    padding-right: 7px;
  }
  .nc-console-action-group {
    margin-left: 0;
  }
  .nc-tabs-scroll {
    padding-right: 12px;
  }
  .nc-system-row {
    gap: 8px;
  }
  .nc-system-key {
    width: 38%;
    min-width: 96px;
    max-width: 150px;
  }
}

/* Modal/Dialog for storage edit */
.nc-modal-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--nc-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.nc-modal {
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  border-radius: var(--nc-radius);
  padding: 16px;
  min-width: 280px;
  max-width: 90%;
}
.nc-modal h3 {
  color: var(--nc-text);
  font-size: 13px;
  margin-bottom: 12px;
}
.nc-modal label {
  display: block;
  color: var(--nc-text-secondary);
  font-size: 11px;
  margin-bottom: 2px;
}
.nc-modal input, .nc-modal select, .nc-modal textarea {
  width: 100%;
  background: var(--nc-bg-secondary);
  border: 1px solid var(--nc-border);
  color: var(--nc-text);
  padding: 4px 8px;
  border-radius: var(--nc-radius);
  font-size: 12px;
  font-family: var(--nc-font);
  margin-bottom: 8px;
  outline: none;
}
.nc-modal input:focus, .nc-modal textarea:focus {
  border-color: var(--nc-accent);
}
.nc-modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.nc-modal-btns button {
  padding: 4px 12px;
  border: 1px solid var(--nc-border);
  background: var(--nc-bg-secondary);
  color: var(--nc-text);
  cursor: pointer;
  border-radius: var(--nc-radius);
  font-size: 12px;
  font-family: var(--nc-font);
}
.nc-modal-btns button.nc-primary {
  background: var(--nc-accent);
  border-color: var(--nc-accent);
  color: #fff;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--nc-border);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--nc-scrollbar-hover);
}

/* REPL Panel */
.nc-repl-output {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0;
}
.nc-repl-row {
  padding: 3px 8px;
  border-bottom: 1px solid var(--nc-border);
  font-family: var(--nc-font);
  font-size: var(--nc-font-size);
  word-break: break-all;
  white-space: pre-wrap;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
}
.nc-repl-row:hover {
  background: var(--nc-bg-hover);
}
.nc-repl-input-wrap {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--nc-border);
  background: var(--nc-bg-secondary);
  flex-shrink: 0;
}
.nc-repl-prompt {
  color: var(--nc-accent);
  font-weight: bold;
  font-family: var(--nc-font);
  font-size: var(--nc-font-size);
  line-height: 1.6;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}
.nc-repl-input {
  flex: 1;
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  color: var(--nc-text);
  padding: 4px 8px;
  border-radius: var(--nc-radius);
  font-size: var(--nc-font-size);
  font-family: var(--nc-font);
  outline: none;
  resize: none;
  line-height: 1.4;
  min-height: 24px;
  max-height: 120px;
  overflow-y: auto;
}
.nc-repl-input:focus {
  border-color: var(--nc-accent);
}
.nc-repl-run {
  padding: 4px 12px;
  background: var(--nc-accent);
  border: none;
  color: #fff;
  cursor: pointer;
  border-radius: var(--nc-radius);
  font-size: 11px;
  font-family: var(--nc-font);
  font-weight: bold;
  flex-shrink: 0;
  line-height: 1.4;
}
.nc-repl-run:hover {
  background: var(--nc-accent-hover);
}
.nc-repl-code {
  color: var(--nc-text);
  flex: 1;
}
.nc-repl-result {
  color: var(--nc-info);
  flex: 1;
}
.nc-repl-err {
  color: var(--nc-error);
}
.nc-repl-input .nc-repl-row.nc-repl-input {
  color: var(--nc-text-secondary);
}
`,S=[{key:"console",label:"Console"},{key:"network",label:"Network"},{key:"storage",label:"Storage"},{key:"element",label:"Element"},{key:"system",label:"System"},{key:"repl",label:"REPL"}];let ke=class ke{constructor(o={}){this.visible=!1,this.mounted=!1,this.destroyed=!1,this.cleanups=[],this.plugins=[],this.pluginTabs=[],this.pluginPanelsRendered=new Set,this.initialized=!1,this.config=o,this.activeTab=o.defaultTab||"console",this.host=document.createElement("div"),this.host.id="nextconsole-host",this.shadow=this.host.attachShadow({mode:"closed"}),this.consoleCore=new J(o.console),this.networkCore=new se(o.network),this.storageCore=new oe(o.storage),this.elementCore=new ae,this.replCore=new le}init(){let e=()=>{if(this.destroyed||this.mounted)return;(this.config.target||document.body).appendChild(this.host);let o=document.createElement("style");if(o.textContent=k,this.shadow.appendChild(o),this.applyTheme(this.config.theme||"dark"),this.floatButton=new de(this.shadow,()=>this.toggle(),this.config.buttonPosition),this.createPanel(),this.consoleCore.init(),this.networkCore.init(),this.storageCore.init(),this.elementCore.init(),this.config.panelHeight){let o=R(this.config.panelHeight,.1,.9);this.panelEl.style.setProperty("--nc-panel-height",`${100*o}vh`)}for(let o of(this.initialized=!0,this.mounted=!0,this.plugins))this.initPlugin(o);this.applyVisibility(),this.config.onReady?.()};document.body?e():(document.addEventListener("DOMContentLoaded",e,{once:!0}),this.cleanups.push(()=>document.removeEventListener("DOMContentLoaded",e)))}createPanel(){this.backdropEl=document.createElement("div"),this.backdropEl.className="nc-backdrop",this.backdropEl.addEventListener("click",()=>this.hide()),this.shadow.appendChild(this.backdropEl),this.panelEl=document.createElement("div"),this.panelEl.className="nc-panel";let o=document.createElement("div");o.className="nc-resize-handle",this.panelEl.appendChild(o),this.bindResize(o);let a=document.createElement("div");a.className="nc-tab-bar";let l=document.createElement("button");l.type="button",l.className="nc-close-btn",l.textContent="✕",l.title="Close",l.setAttribute("aria-label","Close NextConsole"),l.addEventListener("click",()=>this.hide()),a.appendChild(l);let c=document.createElement("div");for(let o of(c.className="nc-tabs-scroll",S)){let a=document.createElement("div");a.className=`nc-tab${o.key===this.activeTab?" nc-tab-active":""}`,a.textContent=o.label,a.dataset.ncTab=o.key,c.appendChild(a)}for(let o of(a.appendChild(c),this.panelEl.appendChild(a),this.tabContentEl=document.createElement("div"),this.tabContentEl.className="nc-tab-content",S)){let a=document.createElement("div");a.className=`nc-tab-pane${o.key===this.activeTab?" nc-tab-pane-active":""}`,a.dataset.ncPane=o.key,this.tabContentEl.appendChild(a)}this.panelEl.appendChild(this.tabContentEl),this.shadow.appendChild(this.panelEl),a.addEventListener("click",o=>{let a=o.target.closest("[data-nc-tab]");a&&this.switchTab(a.dataset.ncTab)}),this.activatePanel(this.activeTab)}switchTab(o){o!==this.activeTab&&(this.activeTab=o,this.shadow.querySelectorAll(".nc-tab").forEach(a=>{a.classList.toggle("nc-tab-active",a.dataset.ncTab===o)}),this.shadow.querySelectorAll(".nc-tab-pane").forEach(a=>{a.classList.toggle("nc-tab-pane-active",a.dataset.ncPane===o)}),this.activatePanel(o))}activatePanel(o){let a=this.shadow.querySelector(`[data-nc-pane="${o}"]`);if(a)switch(o){case"console":this.consolePanel?this.consolePanel.refresh():this.consolePanel=new ue(a,this.consoleCore);break;case"network":this.networkPanel?this.networkPanel.refresh():this.networkPanel=new fe(a,this.networkCore);break;case"storage":this.storagePanel?this.storagePanel.refreshTable():this.storagePanel=new ge(a,this.storageCore);break;case"element":this.elementPanel||(this.elementPanel=new me(a,this.elementCore));break;case"system":this.systemPanel||(this.systemPanel=new ye(a));break;case"repl":this.replPanel||(this.replPanel=new xe(a,this.replCore));break;default:if(o.startsWith("plugin-")&&!this.pluginPanelsRendered.has(o)){let l=o.slice(7),c=this.plugins.find(o=>o.name===l);c?.tab&&(c.tab.render(a,this.getPluginAPI()),this.pluginPanelsRendered.add(o))}}}bindResize(o){let a=0,l=0,c=!1,r=o=>{if(!c)return;let d=R(l+(a-o),100,window.innerHeight-60);this.panelEl.style.height=`${d}px`},i=()=>{c=!1};o.addEventListener("mousedown",o=>{c=!0,a=o.clientY,l=this.panelEl.offsetHeight}),o.addEventListener("touchstart",o=>{c=!0,a=o.touches[0].clientY,l=this.panelEl.offsetHeight},{passive:!0}),this.cleanups.push(v(window,"mousemove",o=>r(o.clientY)),v(window,"mouseup",i),v(window,"touchmove",o=>r(o.touches[0].clientY)),v(window,"touchend",i))}show(){this.visible||(this.visible=!0,this.applyVisibility())}hide(){this.visible&&(this.visible=!1,this.applyVisibility())}applyVisibility(){this.mounted&&(this.backdropEl.classList.toggle("nc-backdrop-visible",this.visible),this.panelEl.classList.toggle("nc-panel-visible",this.visible),this.visible?(this.floatButton.hide(),this.activatePanel(this.activeTab)):this.floatButton.show())}toggle(){this.visible?this.hide():this.show()}isVisible(){return this.visible}getConsoleCore(){return this.consoleCore}getNetworkCore(){return this.networkCore}getStorageCore(){return this.storageCore}setTheme(o){this.applyTheme(o)}applyTheme(o){"light"===o?this.host.classList.add("nc-theme-light"):this.host.classList.remove("nc-theme-light")}use(o){this.plugins.some(a=>a.name===o.name)||(this.plugins.push(o),this.initialized&&this.initPlugin(o))}getPluginAPI(){return this.pluginAPI||(this.pluginAPI={consoleCore:this.consoleCore,networkCore:this.networkCore,storageCore:this.storageCore,addStyle:o=>{let a=document.createElement("style");a.textContent=o,this.shadow.appendChild(a)},log:(...o)=>{console.log("[NextConsole Plugin]",...o)},show:()=>this.show(),hide:()=>this.hide()}),this.pluginAPI}initPlugin(o){let a=this.getPluginAPI();if(o.tab){let a=`plugin-${o.name}`;this.pluginTabs.push({key:a,label:o.tab.label});let l=this.shadow.querySelector(".nc-tabs-scroll");if(l){let c=document.createElement("div");c.className="nc-tab",c.textContent=o.tab.label,c.dataset.ncTab=a,l.appendChild(c)}if(this.tabContentEl){let o=document.createElement("div");o.className="nc-tab-pane",o.dataset.ncPane=a,this.tabContentEl.appendChild(o)}}o.init?.(a)}destroyPlugin(o){let a=`plugin-${o.name}`;if(o.tab&&this.pluginPanelsRendered.has(a))try{o.tab.destroy?.()}catch(a){console.error("[NextConsole Plugin] tab destroy failed",o.name,a)}try{o.destroy?.()}catch(a){console.error("[NextConsole Plugin] destroy failed",o.name,a)}}destroy(){if(!this.destroyed){for(let o of(this.destroyed=!0,this.consolePanel?.destroy(),this.networkPanel?.destroy(),this.storagePanel?.destroy(),this.elementPanel?.destroy(),this.systemPanel?.destroy(),this.replPanel?.destroy(),this.floatButton?.destroy(),this.plugins))this.destroyPlugin(o);this.consoleCore.destroy(),this.networkCore.destroy(),this.storageCore.destroy(),this.elementCore.destroy(),this.replCore.destroy(),this.plugins.length=0,this.pluginTabs.length=0,this.pluginPanelsRendered.clear(),this.cleanups.forEach(o=>o()),this.cleanups.length=0,this.host.remove(),this.mounted=!1}}};let E=`
.nc-source-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.nc-source-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--nc-border);
  cursor: pointer;
  transition: background 0.15s;
}
.nc-source-item:hover {
  background: var(--nc-bg-hover);
}
.nc-source-item-active {
  background: var(--nc-bg-active);
}
.nc-source-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  margin-right: 6px;
  text-transform: uppercase;
}
.nc-source-tag-script { background: #2b5b84; color: #9cdcfe; }
.nc-source-tag-style { background: #5b3a84; color: #dbb6f2; }
.nc-source-tag-inline-script { background: #1e4a3a; color: #89d185; }
.nc-source-tag-inline-style { background: #4a3a1e; color: #d1b185; }
.nc-source-name {
  color: var(--nc-text);
  font-size: 12px;
  word-break: break-all;
}
.nc-source-meta {
  color: var(--nc-text-muted);
  font-size: 11px;
  margin-top: 2px;
}
.nc-source-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nc-source-detail-header {
  padding: 6px 10px;
  background: var(--nc-bg-secondary);
  border-bottom: 1px solid var(--nc-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.nc-source-detail-title {
  font-size: 12px;
  color: var(--nc-text);
  word-break: break-all;
}
.nc-source-detail-back {
  padding: 2px 8px;
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  color: var(--nc-text);
  cursor: pointer;
  border-radius: var(--nc-radius);
  font-size: 11px;
  flex-shrink: 0;
  margin-left: 8px;
}
.nc-source-detail-back:hover {
  background: var(--nc-bg-hover);
}
.nc-source-code {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0;
  margin: 0;
  background: var(--nc-bg);
  counter-reset: line;
}
.nc-source-line {
  display: flex;
  padding: 0 12px 0 0;
  min-height: 18px;
  line-height: 18px;
}
.nc-source-line:hover {
  background: var(--nc-bg-hover);
}
.nc-source-lineno {
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 12px;
  color: var(--nc-text-muted);
  user-select: none;
  -webkit-user-select: none;
  flex-shrink: 0;
  font-size: 11px;
}
.nc-source-linetext {
  white-space: pre;
  color: var(--nc-text);
  flex: 1;
  overflow-x: auto;
}
.nc-source-empty {
  padding: 20px;
  text-align: center;
  color: var(--nc-text-muted);
}
.nc-source-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
`;function Se(o){return o<1024?`${o} B`:o<1048576?`${(o/1024).toFixed(1)} KB`:`${(o/1048576).toFixed(1)} MB`}function Te(){let o=[];return document.querySelectorAll("script[src]").forEach(a=>{let l=a.src;o.push({type:"script",url:l})}),document.querySelectorAll("script:not([src])").forEach(a=>{let l=a.textContent||"";l.trim()&&o.push({type:"inline-script",content:l,size:l.length})}),document.querySelectorAll('link[rel="stylesheet"]').forEach(a=>{let l=a.href;o.push({type:"style",url:l})}),document.querySelectorAll("style").forEach(a=>{let l=a.textContent||"";l.trim()&&!a.closest("#nextconsole-host")&&o.push({type:"inline-style",content:l,size:l.length})}),o}function $e(o){if(o.url)try{let a=new URL(o.url);return a.pathname.split("/").pop()||a.pathname}catch{return o.url}let a=(o.content||"").trim().slice(0,60);return a+(a.length>=60?"...":"")}function ze(){let o;function e(){let a=Te();if(0===a.length){o.innerHTML='<div class="nc-source-view"><div class="nc-source-empty">No sources found</div></div>';return}let l=a.map((o,a)=>{let l=`nc-source-tag-${o.type}`,c=o.type.replace("-"," "),d=h($e(o)),p=o.url?h(o.url):`${Se(o.size||0)}`;return`<div class="nc-source-item" data-idx="${a}">
        <span class="nc-source-tag ${l}">${c}</span>
        <span class="nc-source-name">${d}</span>
        <div class="nc-source-meta">${p}</div>
      </div>`}).join("");o.innerHTML=`
      <div class="nc-source-view">
        <div class="nc-toolbar">
          <button class="nc-toolbar-btn nc-source-refresh">Refresh</button>
          <span style="color:var(--nc-text-muted);font-size:11px;margin-left:8px">${a.length} sources</span>
        </div>
        <div class="nc-source-list">${l}</div>
      </div>`,o.querySelector(".nc-source-refresh").addEventListener("click",e),o.querySelector(".nc-source-list").addEventListener("click",o=>{let l=o.target.closest(".nc-source-item");l&&t(a[parseInt(l.dataset.idx,10)])})}async function t(a){let l=a.url?h(a.url):h(a.type);o.innerHTML=`
      <div class="nc-source-view">
        <div class="nc-source-detail-header">
          <span class="nc-source-detail-title">${l}</span>
          <button class="nc-source-detail-back">← Back</button>
        </div>
        <div class="nc-source-code"><div class="nc-source-empty">Loading...</div></div>
      </div>`,o.querySelector(".nc-source-detail-back").addEventListener("click",e);let c=a.content||"";if(!c&&a.url)try{c=await (await fetch(a.url)).text()}catch(a){o.querySelector(".nc-source-code").innerHTML=`<div class="nc-source-empty" style="color:var(--nc-error)">Failed to fetch: ${h(String(a))}</div>`;return}let d=c.split(`
`),p=o.querySelector(".nc-source-code"),u=Math.min(d.length,5e3),g="";for(let o=0;o<u;o++)g+=`<div class="nc-source-line"><span class="nc-source-lineno">${o+1}</span><span class="nc-source-linetext">${h(d[o])}</span></div>`;d.length>5e3&&(g+=`<div class="nc-source-empty">... ${d.length-5e3} more lines truncated</div>`),p.innerHTML=g}return{name:"source",version:"1.0.0",tab:{label:"Source",render(a,l){o=a,l.addStyle(E),e()},destroy(){o.innerHTML=""}}}}let T=`
.nc-perf-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.nc-perf-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px;
}
.nc-perf-section {
  margin-bottom: 12px;
}
.nc-perf-section-title {
  font-size: 12px;
  font-weight: bold;
  color: var(--nc-text);
  padding: 6px 0 4px;
  border-bottom: 1px solid var(--nc-border);
  margin-bottom: 6px;
}
.nc-perf-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}
.nc-perf-card {
  background: var(--nc-bg-secondary);
  border: 1px solid var(--nc-border);
  border-radius: var(--nc-radius);
  padding: 8px 10px;
  border-left: 3px solid var(--nc-border);
}
.nc-perf-card-good { border-left-color: #3dc9b0; }
.nc-perf-card-needs-improvement { border-left-color: #cca700; }
.nc-perf-card-poor { border-left-color: #f14c4c; }
.nc-perf-card-name {
  font-size: 10px;
  color: var(--nc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.nc-perf-card-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--nc-text);
  margin: 2px 0;
}
.nc-perf-card-unit {
  font-size: 11px;
  color: var(--nc-text-secondary);
  font-weight: normal;
}
.nc-perf-bar-wrap {
  display: flex;
  align-items: center;
  padding: 3px 0;
  font-size: 11px;
  gap: 6px;
}
.nc-perf-bar-label {
  flex-shrink: 0;
  width: 100px;
  color: var(--nc-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nc-perf-bar-track {
  flex: 1;
  height: 14px;
  background: var(--nc-bg-secondary);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.nc-perf-bar-fill {
  height: 100%;
  border-radius: 2px;
  min-width: 1px;
}
.nc-perf-bar-fill-script { background: #2b5b84; }
.nc-perf-bar-fill-css { background: #5b3a84; }
.nc-perf-bar-fill-img { background: #3a845b; }
.nc-perf-bar-fill-font { background: #845b3a; }
.nc-perf-bar-fill-other { background: #555; }
.nc-perf-bar-value {
  flex-shrink: 0;
  width: 60px;
  text-align: right;
  color: var(--nc-text-muted);
}
.nc-perf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.nc-perf-table th {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--nc-border);
  color: var(--nc-text-muted);
  font-weight: normal;
  text-transform: uppercase;
  font-size: 10px;
  position: sticky;
  top: 0;
  background: var(--nc-bg);
}
.nc-perf-table td {
  padding: 3px 8px;
  border-bottom: 1px solid var(--nc-border);
  color: var(--nc-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.nc-perf-table tr:hover td {
  background: var(--nc-bg-hover);
}
.nc-perf-empty {
  text-align: center;
  color: var(--nc-text-muted);
  padding: 16px;
}
.nc-perf-mark-btn {
  padding: 2px 8px;
  background: var(--nc-bg);
  border: 1px solid var(--nc-border);
  color: var(--nc-text);
  cursor: pointer;
  border-radius: var(--nc-radius);
  font-size: 11px;
  margin-left: 6px;
}
.nc-perf-mark-btn:hover { background: var(--nc-bg-hover); }
`;function $(o){return o<1?`${(1e3*o).toFixed(0)} μs`:o<1e3?`${o.toFixed(1)} ms`:`${(o/1e3).toFixed(2)} s`}function B(o){return o<=0?"—":o<1024?`${o} B`:o<1048576?`${(o/1024).toFixed(1)} KB`:`${(o/1048576).toFixed(1)} MB`}function L(o,a){switch(o){case"FCP":return a<=1800?"good":a<=3e3?"needs-improvement":"poor";case"LCP":return a<=2500?"good":a<=4e3?"needs-improvement":"poor";case"FID":return a<=100?"good":a<=300?"needs-improvement":"poor";case"CLS":return a<=.1?"good":a<=.25?"needs-improvement":"poor";case"TTFB":return a<=800?"good":a<=1800?"needs-improvement":"poor";case"INP":return a<=200?"good":a<=500?"needs-improvement":"poor";default:return"good"}}function Ce(o){let a=o.name.split("?")[0].split(".").pop()?.toLowerCase()||"";return["js","mjs"].includes(a)||"script"===o.initiatorType?"script":["css"].includes(a)||"css"===o.initiatorType||"link"===o.initiatorType?"css":["png","jpg","jpeg","gif","webp","svg","ico","avif"].includes(a)||"img"===o.initiatorType?"img":["woff","woff2","ttf","otf","eot"].includes(a)?"font":"other"}function Re(o){try{let a=new URL(o),l=a.pathname.split("/").pop()||a.pathname;return l.length>40?l.slice(0,37)+"...":l}catch{return o.slice(0,40)}}function He(){let o=[],a=performance.getEntriesByType("navigation");if(a.length>0){let l=a[0],c=l.responseStart-l.requestStart;c>0&&o.push({name:"TTFB",value:c,unit:"ms",rating:L("TTFB",c)});let d=l.domContentLoadedEventEnd-l.startTime;d>0&&o.push({name:"DOM Ready",value:d,unit:"ms",rating:L("FCP",d)});let p=l.loadEventEnd-l.startTime;p>0&&o.push({name:"Load",value:p,unit:"ms",rating:L("LCP",p)});let u=l.domainLookupEnd-l.domainLookupStart;u>0&&o.push({name:"DNS",value:u,unit:"ms",rating:"good"});let g=l.connectEnd-l.connectStart;g>0&&o.push({name:"TCP",value:g,unit:"ms",rating:"good"})}for(let a of performance.getEntriesByType("paint"))"first-paint"===a.name&&o.push({name:"FP",value:a.startTime,unit:"ms",rating:L("FCP",a.startTime)}),"first-contentful-paint"===a.name&&o.push({name:"FCP",value:a.startTime,unit:"ms",rating:L("FCP",a.startTime)});let l=performance.memory;return l&&(o.push({name:"JS Heap",value:l.usedJSHeapSize/1048576,unit:"MB",rating:l.usedJSHeapSize/l.jsHeapSizeLimit>.9?"poor":"good"}),o.push({name:"Heap Limit",value:l.jsHeapSizeLimit/1048576,unit:"MB",rating:"good"})),o}function Me(){return performance.getEntriesByType("resource").map(o=>({name:o.name,type:Ce(o),duration:o.duration,size:o.transferSize||0,startTime:o.startTime})).sort((o,a)=>a.duration-o.duration)}function Pe(){try{return performance.getEntriesByType("longtask").map(o=>({startTime:o.startTime,duration:o.duration})).sort((o,a)=>a.duration-o.duration)}catch{return[]}}function Ne(){let o,a=null,l=[],c=[];function s(){let a=He(),d=Me(),p=[...l,...Pe()],u=new Map;for(let o of p)u.set(o.startTime,o);let g=[...u.values()].sort((o,a)=>a.duration-o.duration),f=new Map;for(let o of d){let a=f.get(o.type)||{count:0,totalSize:0,totalDuration:0};a.count++,a.totalSize+=o.size,a.totalDuration+=o.duration,f.set(o.type,a)}d.length>0&&d.map(o=>o.duration);let b=a.length>0?a.map(o=>`
        <div class="nc-perf-card nc-perf-card-${o.rating}">
          <div class="nc-perf-card-name">${h(o.name)}</div>
          <div class="nc-perf-card-value">${"ms"===o.unit?$(o.value):o.value.toFixed(1)}<span class="nc-perf-card-unit"> ${"ms"===o.unit?"":o.unit}</span></div>
        </div>`).join(""):'<div class="nc-perf-empty">No metrics available yet</div>',y=d.reduce((o,a)=>o+a.size,0),x=["script","css","img","font","other"].filter(o=>f.has(o)).map(o=>{let a=f.get(o),l=y>0?a.totalSize/y*100:0;return`<div class="nc-perf-bar-wrap">
          <span class="nc-perf-bar-label">${o} (${a.count})</span>
          <div class="nc-perf-bar-track"><div class="nc-perf-bar-fill nc-perf-bar-fill-${o}" style="width:${Math.max(l,1)}%"></div></div>
          <span class="nc-perf-bar-value">${B(a.totalSize)}</span>
        </div>`}).join(""),w=d.slice(0,30).map(o=>`
      <tr>
        <td title="${h(o.name)}">${h(Re(o.name))}</td>
        <td>${o.type}</td>
        <td>${$(o.duration)}</td>
        <td>${B(o.size)}</td>
      </tr>`).join(""),k=g.length>0?g.slice(0,20).map(o=>`
        <tr>
          <td>${$(o.startTime)}</td>
          <td style="color:${o.duration>100?"var(--nc-error)":"var(--nc-warn)"}">${$(o.duration)}</td>
        </tr>`).join(""):"",S=performance.getEntriesByType("mark"),E=S.length>0?S.map(o=>`
        <tr>
          <td>${h(o.name)}</td>
          <td>${$(o.startTime)}</td>
        </tr>`).join(""):"";o.innerHTML=`
      <div class="nc-perf-view">
        <div class="nc-toolbar">
          <button class="nc-toolbar-btn nc-perf-refresh">Refresh</button>
          <button class="nc-perf-mark-btn nc-perf-mark">+ Mark</button>
        </div>
        <div class="nc-perf-scroll">
          <div class="nc-perf-section">
            <div class="nc-perf-section-title">Core Metrics</div>
            <div class="nc-perf-metrics">${b}</div>
          </div>

          ${x?`
          <div class="nc-perf-section">
            <div class="nc-perf-section-title">Resource Breakdown (${d.length} resources, ${B(y)} total)</div>
            ${x}
          </div>`:""}

          ${w?`
          <div class="nc-perf-section">
            <div class="nc-perf-section-title">Slowest Resources</div>
            <table class="nc-perf-table">
              <tr><th>Name</th><th>Type</th><th>Duration</th><th>Size</th></tr>
              ${w}
            </table>
          </div>`:""}

          ${k?`
          <div class="nc-perf-section">
            <div class="nc-perf-section-title">Long Tasks (${g.length})</div>
            <table class="nc-perf-table">
              <tr><th>Start</th><th>Duration</th></tr>
              ${k}
            </table>
          </div>`:""}

          ${E?`
          <div class="nc-perf-section">
            <div class="nc-perf-section-title">Performance Marks</div>
            <table class="nc-perf-table">
              <tr><th>Name</th><th>Time</th></tr>
              ${E}
            </table>
          </div>`:""}
        </div>
      </div>`,o.querySelector(".nc-perf-refresh").addEventListener("click",s),o.querySelector(".nc-perf-mark").addEventListener("click",()=>{let o=`nc-mark-${c.length+1}`;performance.mark(o),c.push(o),s()})}return{name:"performance",version:"1.0.0",init(){try{(a=new PerformanceObserver(o=>{for(let a of o.getEntries())l.push({startTime:a.startTime,duration:a.duration})})).observe({type:"longtask",buffered:!0})}catch{}},tab:{label:"Perf",render(a,l){o=a,l.addStyle(T),s()},destroy(){o.innerHTML=""}},destroy(){for(let o of(a?.disconnect(),a=null,l=[],c))try{performance.clearMarks(o)}catch{}c=[]}}}let C=null;let Be=class Be{constructor(o){C&&C.destroy(),C=this,this.panel=new ke(o),this.panel.init()}show(){this.panel.show()}hide(){this.panel.hide()}toggle(){this.panel.toggle()}get isVisible(){return this.panel.isVisible()}appendStream(o,a){this.panel.getConsoleCore().appendStream(o,a)}endStream(o){this.panel.getConsoleCore().endStream(o)}setTheme(o){this.panel.setTheme(o)}clearConsole(){this.panel.getConsoleCore().clear()}clearNetwork(){this.panel.getNetworkCore().clear()}exportLogs(){return this.panel.getConsoleCore().exportJSON()}getLogEntries(){return this.panel.getConsoleCore().getEntries()}getNetworkEntries(){return this.panel.getNetworkCore().getEntries()}use(o){return this.panel.use(o),this}destroy(){C===this&&(C=null),this.panel.destroy()}}}}]);
//# sourceMappingURL=716.ba0d45cb.js.map