import{a,j as e}from"./jsx-runtime-37f7df21.js";import{M as i}from"./MessageFormattedString-7672c9f4.js";import"./index-f1f2c4b1.js";import"./MessageFormatted-2ac5f461.js";import"./Button-171a86dd.js";import"./SharedHudVars-63c800bd.js";import"./PixelartIcon-62975882.js";import"./vanilla-66a0fdf5.js";import"./chatUtils-94ce7110.js";const P=({playersLists:t,clientId:p,tablistHeader:u,tablistFooter:o,serverIP:m,style:c})=>a("div",{className:"playerlist-container",id:"playerlist-container",style:c,children:[a("span",{className:"playerlist-title",children:["Server IP: ",m]}),e("div",{className:"playerlist-header",children:e(i,{message:u})}),e("div",{className:"player-lists",children:t.map((y,g)=>e("div",{className:"player-list",children:y.map(r=>a("div",{className:`playerlist-entry${p===r.uuid?" active-player":""}`,id:`plist-player-${r.uuid}`,children:[e(i,{message:r.username}),a("div",{className:"playerlist-ping",children:[e("p",{className:"playerlist-ping-value",children:r.ping}),e("p",{className:"playerlist-ping-label",children:"ms"})]})]},r.uuid??r.username))},g))}),e("div",{className:"playerlist-footer",children:e(i,{message:o})})]});try{PlayerListOverlay.displayName="PlayerListOverlay",PlayerListOverlay.__docgenInfo={description:"",displayName:"PlayerListOverlay",props:{playersLists:{defaultValue:null,description:"",name:"playersLists",required:!0,type:{name:"PlayersLists"}},clientId:{defaultValue:null,description:"",name:"clientId",required:!0,type:{name:"string"}},tablistHeader:{defaultValue:null,description:"",name:"tablistHeader",required:!0,type:{name:"string | Record<string, any> | null"}},tablistFooter:{defaultValue:null,description:"",name:"tablistFooter",required:!0,type:{name:"string | Record<string, any> | null"}},serverIP:{defaultValue:null,description:"",name:"serverIP",required:!0,type:{name:"string"}},style:{defaultValue:null,description:"",name:"style",required:!1,type:{name:"CSSProperties"}}}}}catch{}const O={component:P},s={args:{playersLists:[[{username:"Player 1",ping:10,uuid:"1"},{username:"Player 2",ping:20,uuid:"2"},{username:"Player 3",ping:30,uuid:"3"}]],clientId:"2",tablistHeader:"Header",tablistFooter:"Footer",serverIP:"95.163.228.101"}};var l,n,d;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    playersLists: [[{
      username: 'Player 1',
      ping: 10,
      uuid: '1'
    }, {
      username: 'Player 2',
      ping: 20,
      uuid: '2'
    }, {
      username: 'Player 3',
      ping: 30,
      uuid: '3'
    }]],
    clientId: '2',
    tablistHeader: 'Header',
    tablistFooter: 'Footer',
    serverIP: '95.163.228.101'
  }
}`,...(d=(n=s.parameters)==null?void 0:n.docs)==null?void 0:d.source}}};const q=["Primary"];export{s as Primary,q as __namedExportsOrder,O as default};
//# sourceMappingURL=PlayerListOverlay.stories-29a5f8a3.js.map
