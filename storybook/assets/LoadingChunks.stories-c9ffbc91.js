import{j as o,a as z}from"./jsx-runtime-37f7df21.js";import{r as h}from"./index-f1f2c4b1.js";const y=({regionFiles:n=[],stateMap:s={},displayText:t=!1,playerChunk:e=null})=>{const r=n.map(a=>a.split(".").slice(1,3).map(Number)),i=Math.min(...r.map(([a])=>a)),p=Math.max(...r.map(([a])=>a)),l=Math.min(...r.map(([,a])=>a)),k=Math.max(...r.map(([,a])=>a)),c=p-i+1,x=k-l+1;return o("div",{style:{display:"grid",gridTemplateColumns:`repeat(${c}, 1fr)`,gridTemplateRows:`repeat(${x}, 1fr)`,gap:1,width:"110px",height:"110px"},children:Array.from({length:c*x}).map((a,d)=>{const u=i+d%c,g=l+Math.floor(d/c),f=`r.${u}.${g}.mca`,v=s[f];return n.includes(f)?o($,{x:u,z:g,state:v,displayText:t,currentPlayer:(e==null?void 0:e.x)===u&&(e==null?void 0:e.z)===g},d):o("div",{style:{background:"gray"}},d)})})},$=({x:n,z:s,state:t,displayText:e,currentPlayer:r})=>{const i=e?`${n},${s}`:void 0;return z("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",background:t==="errored"?"red":t==="loading"?"white":"limegreen",animation:t==="loading"?"loading-chunks-loading-animation 4s infinite cubic-bezier(0.4, 0, 0.2, 1)":void 0,transition:"background 1s",color:t==="loading"?"black":"white",position:"relative",zIndex:1},children:[r&&o("div",{style:{position:"absolute",background:"red",borderRadius:"50%",width:"5px",height:"5px",zIndex:-1}}),i]})};try{LoadingChunks.displayName="LoadingChunks",LoadingChunks.__docgenInfo={description:"",displayName:"LoadingChunks",props:{regionFiles:{defaultValue:null,description:"",name:"regionFiles",required:!1,type:{name:"string[]"}},stateMap:{defaultValue:null,description:"",name:"stateMap",required:!1,type:{name:"Record<string, string>"}},displayText:{defaultValue:null,description:"",name:"displayText",required:!1,type:{name:"boolean"}},playerChunk:{defaultValue:null,description:"",name:"playerChunk",required:!1,type:{name:"{ x: number; z: number; } | null"}}}}}catch{}const F={component:y,render(n){const[s,t]=h.useState(Object.fromEntries(n.regionFiles.map(e=>e.split(".").slice(1,3).map(Number).map(r=>r.toString()).join(",")).map(e=>[e,"loading"])));return h.useEffect(()=>{const e=setInterval(()=>{const r=Math.floor(Math.random()*n.regionFiles.length),[i,p]=n.regionFiles[r].split(".").slice(1,3).map(Number);t(l=>({...l,[`${i},${p}`]:"done"}))},1e3);return()=>clearInterval(e)},[]),o(y,{stateMap:s,...n})}},m={args:{regionFiles:["r.-1.-1.mca","r.-1.0.mca","r.0.-1.mca","r.0.0.mca","r.0.1.mca"],playerChunk:{x:-1,z:0},displayText:!0}};var b,M,_;m.parameters={...m.parameters,docs:{...(b=m.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    regionFiles: ['r.-1.-1.mca', 'r.-1.0.mca', 'r.0.-1.mca', 'r.0.0.mca', 'r.0.1.mca'],
    playerChunk: {
      x: -1,
      z: 0
    },
    displayText: true
  }
}`,...(_=(M=m.parameters)==null?void 0:M.docs)==null?void 0:_.source}}};const I=["Primary"];export{m as Primary,I as __namedExportsOrder,F as default};
//# sourceMappingURL=LoadingChunks.stories-c9ffbc91.js.map
