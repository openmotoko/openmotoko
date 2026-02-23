interface WidgetConfig {
	apiUrl: string
	title?: string
}

export function getWidgetHTML(config: WidgetConfig): string {
	const title = config.title ?? 'OpenMotoko'
	const apiUrl = config.apiUrl.replace(/\/+$/, '')

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#0a0a0f;
--surface:#12121a;
--surface2:#1a1a26;
--border:#2a2a3a;
--neon:#00ffcc;
--neon-dim:#00cc99;
--neon-glow:rgba(0,255,204,0.15);
--text:#e0e0e8;
--text-dim:#8888a0;
--font-mono:'Courier New',Consolas,monospace;
--radius:8px;
}
body{
background:var(--bg);
font-family:var(--font-mono);
color:var(--text);
height:100vh;
display:flex;
flex-direction:column;
}
#chat-bubble{
position:fixed;
bottom:24px;
right:24px;
width:56px;
height:56px;
border-radius:50%;
background:var(--neon);
color:var(--bg);
border:none;
cursor:pointer;
font-size:24px;
display:flex;
align-items:center;
justify-content:center;
box-shadow:0 0 20px var(--neon-glow);
z-index:1000;
transition:transform 0.2s;
}
#chat-bubble:hover{transform:scale(1.1)}
#chat-panel{
position:fixed;
bottom:96px;
right:24px;
width:400px;
max-width:calc(100vw - 48px);
height:560px;
max-height:calc(100vh - 120px);
background:var(--surface);
border:1px solid var(--border);
border-radius:var(--radius);
display:none;
flex-direction:column;
overflow:hidden;
z-index:999;
box-shadow:0 8px 32px rgba(0,0,0,0.6);
}
#chat-panel.open{display:flex}
.chat-header{
padding:16px;
background:var(--surface2);
border-bottom:1px solid var(--border);
display:flex;
align-items:center;
justify-content:space-between;
}
.chat-header h2{
font-size:14px;
color:var(--neon);
letter-spacing:1px;
text-transform:uppercase;
}
.chat-header button{
background:none;
border:none;
color:var(--text-dim);
cursor:pointer;
font-size:18px;
font-family:var(--font-mono);
}
#messages{
flex:1;
overflow-y:auto;
padding:16px;
display:flex;
flex-direction:column;
gap:12px;
}
#messages::-webkit-scrollbar{width:4px}
#messages::-webkit-scrollbar-track{background:transparent}
#messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
.msg{
max-width:85%;
padding:10px 14px;
border-radius:var(--radius);
font-size:13px;
line-height:1.6;
word-wrap:break-word;
white-space:pre-wrap;
}
.msg.user{
align-self:flex-end;
background:var(--neon-dim);
color:var(--bg);
}
.msg.bot{
align-self:flex-start;
background:var(--surface2);
border:1px solid var(--border);
color:var(--text);
}
.msg.bot code{
background:var(--bg);
padding:2px 6px;
border-radius:3px;
font-size:12px;
}
.msg.bot pre{
background:var(--bg);
padding:10px;
border-radius:4px;
overflow-x:auto;
margin:8px 0;
}
.msg.bot pre code{background:none;padding:0}
.typing-indicator{
align-self:flex-start;
padding:10px 14px;
background:var(--surface2);
border:1px solid var(--border);
border-radius:var(--radius);
font-size:13px;
color:var(--text-dim);
}
.typing-indicator span{animation:blink 1.4s infinite both}
.typing-indicator span:nth-child(2){animation-delay:0.2s}
.typing-indicator span:nth-child(3){animation-delay:0.4s}
@keyframes blink{0%,80%,100%{opacity:0.2}40%{opacity:1}}
.chat-input{
padding:12px 16px;
background:var(--surface2);
border-top:1px solid var(--border);
display:flex;
gap:8px;
}
.chat-input textarea{
flex:1;
background:var(--bg);
border:1px solid var(--border);
border-radius:var(--radius);
color:var(--text);
font-family:var(--font-mono);
font-size:13px;
padding:10px 12px;
resize:none;
outline:none;
max-height:100px;
}
.chat-input textarea:focus{border-color:var(--neon)}
.chat-input button{
background:var(--neon);
color:var(--bg);
border:none;
border-radius:var(--radius);
padding:0 16px;
cursor:pointer;
font-family:var(--font-mono);
font-weight:bold;
font-size:14px;
transition:opacity 0.2s;
}
.chat-input button:disabled{opacity:0.4;cursor:default}
.chat-input button:hover:not(:disabled){opacity:0.85}
.status{
font-size:11px;
color:var(--text-dim);
padding:4px 16px;
background:var(--surface);
text-align:center;
}
</style>
</head>
<body>
<button id="chat-bubble">&#9653;</button>
<div id="chat-panel">
<div class="chat-header">
<h2>${title}</h2>
<button id="close-btn">x</button>
</div>
<div id="status" class="status">Connecting...</div>
<div id="messages"></div>
<div class="chat-input">
<textarea id="input" rows="1" placeholder="Type a message..."></textarea>
<button id="send-btn" disabled>></button>
</div>
</div>
<script>
(function(){
var API='${apiUrl}';
var wsUrl=API.replace(/^http/,'ws')+'/ws';
var panel=document.getElementById('chat-panel');
var bubble=document.getElementById('chat-bubble');
var closeBtn=document.getElementById('close-btn');
var messagesEl=document.getElementById('messages');
var input=document.getElementById('input');
var sendBtn=document.getElementById('send-btn');
var statusEl=document.getElementById('status');
var ws=null;
var sessionId='webchat_'+Array.from(crypto.getRandomValues(new Uint8Array(8)),function(b){return b.toString(16).padStart(2,'0')}).join('')+Date.now().toString(36);
var connected=false;
var typingEl=null;

bubble.onclick=function(){
panel.classList.toggle('open');
if(panel.classList.contains('open')&&!ws)connect();
};
closeBtn.onclick=function(){panel.classList.remove('open')};

function connect(){
statusEl.textContent='Connecting...';
ws=new WebSocket(wsUrl+'?session='+encodeURIComponent(sessionId));
ws.onopen=function(){
connected=true;
sendBtn.disabled=false;
statusEl.textContent='Connected';
setTimeout(function(){statusEl.style.display='none'},2000);
};
ws.onmessage=function(ev){
try{
var data=JSON.parse(ev.data);
if(data.type==='typing'){showTyping();return}
if(data.type==='message'&&data.content){
hideTyping();
addMessage(data.content,'bot');
}
}catch(e){}
};
ws.onclose=function(){
connected=false;
sendBtn.disabled=true;
statusEl.style.display='';
statusEl.textContent='Disconnected. Reconnecting...';
setTimeout(connect,3000);
};
ws.onerror=function(){ws.close()};
}

function addMessage(text,role){
var div=document.createElement('div');
div.className='msg '+role;
if(role==='bot'){
div.innerHTML=renderMarkdown(text);
}else{
div.textContent=text;
}
messagesEl.appendChild(div);
messagesEl.scrollTop=messagesEl.scrollHeight;
}

function showTyping(){
if(typingEl)return;
typingEl=document.createElement('div');
typingEl.className='typing-indicator';
typingEl.innerHTML='<span>.</span><span>.</span><span>.</span>';
messagesEl.appendChild(typingEl);
messagesEl.scrollTop=messagesEl.scrollHeight;
}

function hideTyping(){
if(typingEl){typingEl.remove();typingEl=null}
}

function renderMarkdown(text){
return text
.replace(/&/g,'&amp;')
.replace(/</g,'&lt;')
.replace(/>/g,'&gt;')
.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g,function(_,c){return '<pre><code>'+c.trim()+'</code></pre>'})
.replace(/\`([^\`]+)\`/g,'<code>$1</code>')
.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')
.replace(/\\*(.+?)\\*/g,'<em>$1</em>')
.replace(/[([^]]+)](([^)]+))/g,function(_,t,u){
var lu=u.trim().toLowerCase();
if(lu.indexOf('javascript:')===0||lu.indexOf('data:')===0||lu.indexOf('vbscript:')===0)return t;
return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
})
.replace(/\\n/g,'<br>');
}

function send(){
var text=input.value.trim();
if(!text||!connected)return;
addMessage(text,'user');
input.value='';
input.style.height='auto';
try{
ws.send(JSON.stringify({type:'message',sessionId:sessionId,content:text}));
}catch(e){}
}

sendBtn.onclick=send;
input.onkeydown=function(e){
if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}
};
input.oninput=function(){
this.style.height='auto';
this.style.height=Math.min(this.scrollHeight,100)+'px';
};
})();
</script>
</body>
</html>`
}
