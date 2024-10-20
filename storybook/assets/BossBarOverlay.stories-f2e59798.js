import{a as n,j as r}from"./jsx-runtime-37f7df21.js";import{r as s}from"./index-f1f2c4b1.js";import{M as x}from"./MessageFormattedString-7672c9f4.js";import"./MessageFormatted-2ac5f461.js";import"./Button-171a86dd.js";import"./SharedHudVars-63c800bd.js";import"./PixelartIcon-62975882.js";import"./vanilla-66a0fdf5.js";import"./chatUtils-94ce7110.js";const o=["pink","blue","red","green","yellow","purple","white"],i=[0,6,10,12,20],S={"entity.minecraft.ender_dragon":"Ender Dragon","entity.minecraft.wither":"Wither"},O=({bar:e})=>{const[m,y]=s.useState(""),[p,u]=s.useState({}),[f,_]=s.useState({}),[g,h]=s.useState({}),[v,B]=s.useState({});return s.useEffect(()=>{y(e._title.text?e.title.text:S[e.title.translate]||"Unknown Entity"),u(t=>({...t,backgroundPositionY:`-${o.indexOf(e._color)*10}px`})),_(t=>({...t,width:`${e._health*100}%`,backgroundPositionY:`-${o.indexOf(e._color)*10+5}px`})),h(t=>({...t,backgroundPositionY:`-${i.indexOf(e._dividers)*10+70}px`})),B(t=>({...t,width:`${e._health*100}%`,backgroundPositionY:`-${i.indexOf(e._dividers)*10+75}px`}))},[e]),n("div",{className:"bossbar-container",children:[r("div",{className:"bossbar-title",children:r(x,{message:m})}),n("div",{className:"bossbar",style:p,children:[r("div",{className:"fill",style:f}),r("div",{className:"fill",style:g}),r("div",{className:"fill",style:v})]})]})};try{BossBarOverlay.displayName="BossBarOverlay",BossBarOverlay.__docgenInfo={description:"",displayName:"BossBarOverlay",props:{bar:{defaultValue:null,description:"",name:"bar",required:!0,type:{name:"BossBarType"}}}}}catch{}const U={component:O},a={args:{bar:{entityUUID:"uuid",title:{text:"Boss",translate:"test"},health:100,dividers:2,color:"red",shouldDarkenSky:!1,isDragonBar:!1,createFog:!1,shouldCreateFog:!1,_title:{text:"Boss",translate:"entity.minecraft.ender_dragon"},_color:"red",_dividers:2,_health:100}}};var l,d,c;a.parameters={...a.parameters,docs:{...(l=a.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    bar: {
      entityUUID: 'uuid',
      title: ({
        text: 'Boss',
        translate: 'test'
      } as ChatMessage & {
        text: string;
        translate: string;
      }),
      health: 100,
      dividers: 2,
      color: 'red',
      shouldDarkenSky: false,
      isDragonBar: false,
      createFog: false,
      shouldCreateFog: false,
      _title: {
        text: 'Boss',
        translate: 'entity.minecraft.ender_dragon'
      },
      _color: 'red',
      _dividers: 2,
      _health: 100
    }
  }
}`,...(c=(d=a.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};const Y=["Primary"];export{a as Primary,Y as __namedExportsOrder,U as default};
//# sourceMappingURL=BossBarOverlay.stories-f2e59798.js.map
