import{a as c,j as r}from"./jsx-runtime-37f7df21.js";import{r as a}from"./index-f1f2c4b1.js";import{f as _}from"./chatUtils-94ce7110.js";import{C as h,c as C,f as S}from"./MessageFormatted-2ac5f461.js";import{B as d}from"./Button-171a86dd.js";import"./PixelartIcon-62975882.js";import"./vanilla-66a0fdf5.js";import"./SharedHudVars-63c800bd.js";window.spamMessage=window.spamMessage??"";window.loadedData={language:{}};const $={component:h,render(n){const[m,i]=a.useState(n.messages),[p,x]=a.useState(!1),[u,l]=a.useState(n.opened);a.useEffect(()=>{const e=new AbortController;return addEventListener("keyup",t=>{t.code==="KeyY"&&(C.value="/",l(!0),t.stopImmediatePropagation()),t.code==="Escape"&&(l(!1),t.stopImmediatePropagation())},{signal:e.signal}),()=>e.abort()}),a.useEffect(()=>{i(n.messages)},[n.messages]),a.useEffect(()=>{if(!p)return;const e=()=>{const o=window.spamMessage?_(window.spamMessage):[{text:"tes"},{text:"t"}];i(s=>[...s,...Array.from({length:10}).map((g,k)=>{var w;return{id:(((w=s.at(-1))==null?void 0:w.id)??0)+k+1,parts:o}})])},t=setInterval(()=>e(),5e3);return e(),()=>clearInterval(t)},[p]);const E=()=>{for(const e of m)S(e,!1,()=>{i([...m])})};return c("div",{style:{marginTop:n.usingTouch?100:0},children:[c("div",{style:{fontSize:6,userSelect:"auto",color:"gray"},children:["Hint: you can capture needed message with ",r("code",{children:"bot.on('message', console.log)"}),", copy object, and assign it here to ",r("code",{children:"window.spamMessage"})," variable (but ensure the correct frame window is selected in devtools)"]}),r(h,{...n,opened:u,messages:m,onClose:()=>l(!1),fetchCompletionItems:async(e,t)=>{console.log("fetchCompletionItems"),await new Promise(s=>{setTimeout(s,0)});let o=["test",...Array.from({length:50}).map((s,g)=>`minecraft:hello${g}`)];return t==="/"&&(o=o.map(s=>`/${s}`)),o}}),c(d,{onClick:()=>l(e=>!e),children:["Open: ",u?"on":"off"]}),r(d,{onClick:()=>E(),children:"Fade"}),c(d,{onClick:()=>x(e=>!e),children:["Auto Spam: ",p?"on":"off"]}),r(d,{onClick:()=>i(n.messages),children:"Reset"})]})}},f={args:{usingTouch:!1,allowSelection:!1,messages:[{parts:[{bold:!1,italic:!1,underlined:!1,strikethrough:!1,obfuscated:!1,json:{insertion:"pviewer672",clickEvent:{action:"suggest_command",value:"/tell pviewer672 "},hoverEvent:{action:"show_entity",contents:{type:"minecraft:player",id:"ecd0eeb1-625e-3fea-b16e-cb449dcfa434",name:{text:"pviewer672"}}},text:"pviewer672"},text:"pviewer672",clickEvent:{action:"suggest_command",value:"/tell pviewer672 "},hoverEvent:{action:"show_entity",contents:{type:"minecraft:player",id:"ecd0eeb1-625e-3fea-b16e-cb449dcfa434",name:{text:"pviewer672"}}}},{text:" joined the game",color:"yellow",bold:!1,italic:!1,underlined:!1,strikethrough:!1,obfuscated:!1}],id:0}]}};var v,b,y;f.parameters={...f.parameters,docs:{...(v=f.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    usingTouch: false,
    allowSelection: false,
    messages: [{
      parts: [{
        'bold': false,
        'italic': false,
        'underlined': false,
        'strikethrough': false,
        'obfuscated': false,
        'json': {
          'insertion': 'pviewer672',
          'clickEvent': {
            'action': 'suggest_command',
            'value': '/tell pviewer672 '
          },
          'hoverEvent': {
            'action': 'show_entity',
            'contents': {
              'type': 'minecraft:player',
              'id': 'ecd0eeb1-625e-3fea-b16e-cb449dcfa434',
              'name': {
                'text': 'pviewer672'
              }
            }
          },
          'text': 'pviewer672'
        },
        'text': 'pviewer672',
        'clickEvent': {
          'action': 'suggest_command',
          'value': '/tell pviewer672 '
        },
        'hoverEvent': {
          'action': 'show_entity',
          //@ts-expect-error
          'contents': {
            'type': 'minecraft:player',
            'id': 'ecd0eeb1-625e-3fea-b16e-cb449dcfa434',
            'name': {
              'text': 'pviewer672'
            }
          }
        }
      }, {
        'text': ' joined the game',
        'color': 'yellow',
        'bold': false,
        'italic': false,
        'underlined': false,
        'strikethrough': false,
        'obfuscated': false
      }],
      id: 0
    }]
    // opened: false,
  }
}`,...(y=(b=f.parameters)==null?void 0:b.docs)==null?void 0:y.source}}};const z=["Primary"];export{f as Primary,z as __namedExportsOrder,$ as default};
//# sourceMappingURL=Chat.stories-b4011084.js.map
