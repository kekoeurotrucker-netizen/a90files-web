(()=>{
  'use strict';

  const input=document.getElementById('forum-message');
  const preview=document.getElementById('forum-preview');
  const count=document.getElementById('char-count');
  const emojiToggle=document.querySelector('.emoji-toggle');
  const emojiPicker=document.getElementById('emoji-picker');
  const saveBtn=document.getElementById('save-draft');
  const clearBtn=document.getElementById('clear-draft');
  const publishBtn=document.getElementById('publish-demo');
  if(!input||!preview)return;

  const DRAFT_KEY='a90forum:draft:v1';
  const DEMO_POST_KEY='a90forum:lastDemoPost:v1';
  const MAX=12000;

  // SECURITY MODEL
  // 1) Never inject user content through innerHTML.
  // 2) Raw HTML is treated as plain text.
  // 3) Links are allow-listed to http/https only.
  // 4) Code uses textContent so scripts/HTML remain inert.
  // 5) This client-side protection is defense-in-depth only. The real forum backend
  //    must validate length/schema, sanitize again server-side and store canonical data.

  const safeUrl=(value)=>{
    try{
      const url=new URL(value,location.origin);
      return (url.protocol==='http:'||url.protocol==='https:')?url.href:null;
    }catch{return null;}
  };

  const appendText=(parent,text)=>parent.appendChild(document.createTextNode(text));

  const renderInline=(parent,text)=>{
    // Small, deliberately conservative Markdown-like parser.
    // Anything not explicitly recognized remains text.
    const token=/(`[^`\n]+`|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|\|\|[^|\n]+\|\||\[[^\]\n]+\]\([^\s)]+\)|@[A-Za-z0-9_.-]{2,32})/g;
    let last=0;
    for(const match of text.matchAll(token)){
      if(match.index>last)appendText(parent,text.slice(last,match.index));
      const raw=match[0];
      let el;
      if(raw.startsWith('`')){
        el=document.createElement('code');el.textContent=raw.slice(1,-1);
      }else if(raw.startsWith('**')){
        el=document.createElement('strong');el.textContent=raw.slice(2,-2);
      }else if(raw.startsWith('~~')){
        el=document.createElement('s');el.textContent=raw.slice(2,-2);
      }else if(raw.startsWith('*')){
        el=document.createElement('em');el.textContent=raw.slice(1,-1);
      }else if(raw.startsWith('||')){
        el=document.createElement('button');el.type='button';el.className='forum-spoiler';el.textContent=raw.slice(2,-2);el.setAttribute('aria-label','Mostrar u ocultar spoiler');
      }else if(raw.startsWith('[')){
        const m=raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        const href=m&&safeUrl(m[2]);
        if(href){
          el=document.createElement('a');el.href=href;el.target='_blank';el.rel='noopener noreferrer nofollow ugc';el.textContent=m[1];
        }else{
          appendText(parent,raw);last=match.index+raw.length;continue;
        }
      }else if(raw.startsWith('@')){
        el=document.createElement('span');el.className='forum-mention';el.textContent=raw;
      }
      if(el)parent.appendChild(el);
      last=match.index+raw.length;
    }
    if(last<text.length)appendText(parent,text.slice(last));
  };

  const renderSafe=(source)=>{
    preview.replaceChildren();
    if(!source.trim()){
      const p=document.createElement('p');p.className='preview-empty';p.textContent='Empieza a escribir para ver aquí el mensaje.';preview.appendChild(p);return;
    }

    const lines=source.replace(/\r\n?/g,'\n').split('\n');
    let i=0;
    while(i<lines.length){
      const line=lines[i];
      if(line.startsWith('```')){
        const lang=line.slice(3).trim().replace(/[^A-Za-z0-9_+#.-]/g,'').slice(0,24);
        i++;
        const codeLines=[];
        while(i<lines.length&&!lines[i].startsWith('```')){codeLines.push(lines[i]);i++;}
        if(i<lines.length)i++;
        const wrap=document.createElement('div');wrap.className='code-block';
        const head=document.createElement('div');head.className='code-head';head.textContent=lang||'código';
        const pre=document.createElement('pre');
        const code=document.createElement('code');code.textContent=codeLines.join('\n');
        pre.appendChild(code);wrap.append(head,pre);preview.appendChild(wrap);continue;
      }
      if(!line.trim()){i++;continue;}
      if(line.startsWith('> ')){
        const q=document.createElement('blockquote');renderInline(q,line.slice(2));preview.appendChild(q);i++;continue;
      }
      if(line.startsWith('- ')){
        const ul=document.createElement('ul');
        while(i<lines.length&&lines[i].startsWith('- ')){
          const li=document.createElement('li');renderInline(li,lines[i].slice(2));ul.appendChild(li);i++;
        }
        preview.appendChild(ul);continue;
      }
      const p=document.createElement('p');renderInline(p,line);preview.appendChild(p);i++;
    }
  };

  const update=()=>{
    if(input.value.length>MAX)input.value=input.value.slice(0,MAX);
    if(count)count.textContent=String(input.value.length);
    renderSafe(input.value);
  };

  const insertText=(before,after=before)=>{
    const start=input.selectionStart,end=input.selectionEnd,selected=input.value.slice(start,end);
    input.setRangeText(before+selected+after,start,end,'end');input.focus();update();
  };

  document.querySelectorAll('[data-wrap]').forEach(btn=>btn.addEventListener('click',()=>insertText(btn.dataset.wrap,btn.dataset.wrap)));
  document.querySelectorAll('[data-prefix]').forEach(btn=>btn.addEventListener('click',()=>{
    const start=input.selectionStart;input.setRangeText(btn.dataset.prefix,start,start,'end');input.focus();update();
  }));
  document.querySelectorAll('[data-block="code"]').forEach(btn=>btn.addEventListener('click',()=>insertText('```\n','\n```')));
  document.querySelectorAll('[data-mention]').forEach(btn=>btn.addEventListener('click',()=>insertText('@usuario','')));
  document.querySelectorAll('[data-link]').forEach(btn=>btn.addEventListener('click',()=>insertText('[texto](','https://example.com)')));

  if(emojiToggle&&emojiPicker){
    emojiToggle.addEventListener('click',()=>{const open=!emojiPicker.hidden;emojiPicker.hidden=open;emojiToggle.setAttribute('aria-expanded',String(!open));});
    emojiPicker.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{insertText(btn.textContent||'','');emojiPicker.hidden=true;emojiToggle.setAttribute('aria-expanded','false');}));
  }

  preview.addEventListener('click',(e)=>{const t=e.target;if(t instanceof HTMLElement&&t.classList.contains('forum-spoiler'))t.classList.toggle('revealed');});

  input.addEventListener('input',update);
  saveBtn?.addEventListener('click',()=>{localStorage.setItem(DRAFT_KEY,input.value);saveBtn.textContent='Guardado ✓';setTimeout(()=>saveBtn.textContent='Guardar borrador',1100);});
  clearBtn?.addEventListener('click',()=>{input.value='';localStorage.removeItem(DRAFT_KEY);update();input.focus();});
  publishBtn?.addEventListener('click',()=>{
    const text=input.value.trim();
    if(!text){publishBtn.textContent='Escribe algo primero';setTimeout(()=>publishBtn.textContent='Probar publicación',1200);return;}
    localStorage.setItem(DEMO_POST_KEY,JSON.stringify({text:text.slice(0,MAX),createdAt:new Date().toISOString()}));
    publishBtn.textContent='Publicación local ✓';setTimeout(()=>publishBtn.textContent='Probar publicación',1400);
  });

  document.querySelectorAll('.reaction-bar button').forEach(btn=>btn.addEventListener('click',()=>{
    const n=btn.querySelector('span');if(!n)return;
    const on=btn.classList.toggle('active');n.textContent=String(Math.max(0,Number(n.textContent||0)+(on?1:-1)));
  }));

  const saved=localStorage.getItem(DRAFT_KEY);if(saved)input.value=saved.slice(0,MAX);
  update();
})();