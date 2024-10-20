import{j as r,a as d}from"./jsx-runtime-37f7df21.js";import{S as i}from"./SharedHudVars-63c800bd.js";import"./index-f1f2c4b1.js";const a={"xp-bar-bg":"_xp-bar-bg_1ujp1_1","xp-bar":"_xp-bar_1ujp1_1","xp-label":"_xp-label_1ujp1_23"},c=({progress:s,level:n,gamemode:p})=>r(i,{children:d("div",{id:"xp-bar-bg",className:a["xp-bar-bg"],style:{display:p==="creative"||p==="spectator"?"none":"block"},children:[r("div",{className:a["xp-bar"],style:{width:`${182*s}px`}}),r("span",{className:a["xp-label"],style:{display:n>0?"block":"none"},children:n})]})});try{XPBar.displayName="XPBar",XPBar.__docgenInfo={description:"",displayName:"XPBar",props:{progress:{defaultValue:null,description:"",name:"progress",required:!0,type:{name:"number"}},level:{defaultValue:null,description:"",name:"level",required:!0,type:{name:"number"}},gamemode:{defaultValue:null,description:"",name:"gamemode",required:!0,type:{name:"string"}}}}}catch{}const y={component:c},e={args:{progress:1,level:5},argTypes:{progress:{control:{type:"range",min:0,max:1,step:.1}}}};var t,o,l;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  args: {
    progress: 1,
    level: 5
  },
  // add slider for progress
  argTypes: {
    progress: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1
      }
    }
  }
}`,...(l=(o=e.parameters)==null?void 0:o.docs)==null?void 0:l.source}}};const _=["Primary"];export{e as Primary,_ as __namedExportsOrder,y as default};
//# sourceMappingURL=XPBar.stories-e7e021b8.js.map
