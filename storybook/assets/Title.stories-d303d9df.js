import{a as p,j as e}from"./jsx-runtime-37f7df21.js";import{r as s}from"./index-f1f2c4b1.js";import{M as o}from"./MessageFormattedString-7672c9f4.js";import{T as f}from"./Transition-e8c32a11.js";import"./MessageFormatted-2ac5f461.js";import"./Button-171a86dd.js";import"./SharedHudVars-63c800bd.js";import"./PixelartIcon-62975882.js";import"./vanilla-66a0fdf5.js";import"./chatUtils-94ce7110.js";import"./inheritsLoose-c82a83d4.js";import"./index-c74c9f7f.js";const l=({title:u,subtitle:b,actionBar:E,transitionTimes:t,openTitle:r=!1,openActionBar:i=!1})=>{const[h,_]=s.useState(!1),[O,d]=s.useState(!0),c=500,S={opacity:1,transition:`${t.fadeIn}ms ease-in-out all`},v={opacity:0,transition:`${t.fadeOut}ms ease-in-out all`},m={entering:S,entered:{opacity:1},exiting:v,exited:{opacity:0}};return s.useEffect(()=>{!h&&(r||i)&&_(!0)},[r,i]),p("div",{className:"title-container",children:[e(f,{in:r,timeout:t?{enter:t.fadeIn,exit:t.fadeOut}:c,mountOnEnter:!0,unmountOnExit:!0,enter:O,onExiting:()=>{d(n=>!1)},onExited:()=>{d(n=>!0)},children:n=>p("div",{style:{...m[n]},children:[e("h1",{className:"message-title",children:e(o,{message:u})}),e("h4",{className:"message-subtitle",children:e(o,{message:b})})]})}),e(f,{in:i,timeout:t?{enter:t.fadeIn,exit:t.fadeOut}:c,mountOnEnter:!0,unmountOnExit:!0,children:n=>e("div",{style:{...m[n]},children:e("div",{className:"action-bar",children:e(o,{message:E})})})})]})};try{l.displayName="Title",l.__docgenInfo={description:"",displayName:"Title",props:{title:{defaultValue:null,description:"",name:"title",required:!0,type:{name:"string | Record<string, any>"}},subtitle:{defaultValue:null,description:"",name:"subtitle",required:!0,type:{name:"string | Record<string, any>"}},actionBar:{defaultValue:null,description:"",name:"actionBar",required:!0,type:{name:"string | Record<string, any>"}},transitionTimes:{defaultValue:null,description:"",name:"transitionTimes",required:!0,type:{name:"AnimationTimes"}},openTitle:{defaultValue:{value:"false"},description:"",name:"openTitle",required:!1,type:{name:"boolean"}},openActionBar:{defaultValue:{value:"false"},description:"",name:"openActionBar",required:!1,type:{name:"boolean"}}}}}catch{}const P={component:l},a={args:{openTitle:!1,openActionBar:!1,title:{text:"New title"},subtitle:{text:"Subtitle"},actionBar:{text:"Action bar text"},transitionTimes:{fadeIn:2500,stay:17500,fadeOut:5e3}}};var y,x,g;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    openTitle: false,
    openActionBar: false,
    title: {
      text: 'New title'
    },
    subtitle: {
      text: 'Subtitle'
    },
    actionBar: {
      text: 'Action bar text'
    },
    transitionTimes: {
      fadeIn: 2500,
      stay: 17_500,
      fadeOut: 5000
    }
  }
}`,...(g=(x=a.parameters)==null?void 0:x.docs)==null?void 0:g.source}}};const D=["Primary"];export{a as Primary,D as __namedExportsOrder,P as default};
//# sourceMappingURL=Title.stories-d303d9df.js.map
