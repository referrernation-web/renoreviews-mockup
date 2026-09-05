// RenoReviews.ca prototype behaviour v2. State in the URL (?job=&area=&sort=&cols=); tables are server-rendered and work without JS.
(function(){
  const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)]
  const q = new URLSearchParams(location.search)
  const JOBN = {tts:'Tub-to-shower conversion',shower:'Shower installation',tub:'Bathtub replacement',walkin:'Walk-in tubs',full:'Full bathroom renovation'}
  const PRESETS = { essentials:['transparency','google','price','install','warranty'], reviews:['google','hs','bbb','start'], prices:['transparency','price','warranty','install'], all:['transparency','google','price','install','warranty','hs','bbb','start','walkin','areas','verified'] }
  const state = { job: q.get('job')||'tts', area:(q.get('area')||'ottawa').toLowerCase(), sort:q.get('sort')||'transparency', dir:q.get('dir')||'desc', must:new Set((q.get('must')||'').split(',').filter(Boolean)), cols:(q.get('cols')||'').split(',').filter(Boolean) }
  if(!state.cols.length) state.cols = PRESETS.essentials.slice()

  // ---------- compare tray (all pages) ----------
  const CMP_KEY='rr-compare'; let cmp=[]; try{ cmp=JSON.parse(localStorage.getItem(CMP_KEY)||'[]') }catch{}
  const tray=$('[data-tray]')
  function syncTray(){ $$('input[data-cmp]').forEach(i=>i.checked=cmp.includes(i.dataset.cmp)); if(!tray) return; tray.hidden=cmp.length===0; $('[data-tray-text]',tray).textContent=`Compare ${cmp.length} of 3`; const go=$('[data-tray-go]',tray); go.href=go.href.split('?')[0]+'?compare='+cmp.join(','); go.style.opacity=cmp.length>=2?'1':'.5' }
  document.addEventListener('change', e=>{ const i=e.target.closest('input[data-cmp]'); if(!i) return; const id=i.dataset.cmp; if(i.checked){ if(cmp.length>=3){ i.checked=false; return } if(!cmp.includes(id)) cmp.push(id) } else cmp=cmp.filter(x=>x!==id); try{ localStorage.setItem(CMP_KEY, JSON.stringify(cmp)) }catch{}; syncTray() })
  document.addEventListener('click', e=>{ if(e.target.closest('[data-tray-clear]')){ e.preventDefault(); cmp=[]; try{localStorage.removeItem(CMP_KEY)}catch{}; syncTray() } })
  syncTray()

  // ---------- master table ----------
  const table=$('table[data-master]')
  if(table){
    const tbody=$('tbody',table), rows=$$('tr.row',tbody), dets=Object.fromEntries($$('tr.details',tbody).map(d=>[d.dataset.for,d]))
    const status=$('#status'), priceTh=$('th[data-col=price]',table), mcards=$('[data-mcards]')
    function apply(){
      if(priceTh){ const b=$('button',priceTh); if(b) b.innerHTML=`Complete price from<small>${JOBN[state.job]}</small>` }
      rows.forEach(r=>{ const p=JSON.parse(r.dataset.prices)[state.job]; const td=$('.pricecell',r); if(td) td.innerHTML=p?p:'<span class="dash" title="Not published">—</span>' })
      let shown=0
      rows.forEach(r=>{ let ok = state.area==='ottawa' || r.dataset.areas.includes(state.area)
        if(state.must.has('oneday') && r.dataset.oneday!=='1') ok=false
        if(state.must.has('walkin') && r.dataset.walkin!=='1') ok=false
        if(state.must.has('bbb') && r.dataset.bbbacc!=='1') ok=false
        r.hidden=!ok; if(dets[r.dataset.id]) dets[r.dataset.id].hidden=true; if(ok) shown++ })
      const key=r=> state.sort==='name' ? r.dataset.name.toLowerCase() : parseFloat(r.dataset[state.sort]||0)
      const sorted=[...rows].sort((a,b)=>{ const x=key(a), y=key(b); let c = typeof x==='string' ? x.localeCompare(y) : (x-y) || (parseFloat(b.dataset.reviews)-parseFloat(a.dataset.reviews))*(state.dir==='desc'?1:-1); return state.dir==='desc' ? -c : c })
      sorted.forEach(r=>{ tbody.appendChild(r); if(dets[r.dataset.id]) tbody.appendChild(dets[r.dataset.id]) })
      $$('th',table).forEach(th=>th.removeAttribute('aria-sort')); const th=$$('th button[data-sort]',table).find(b=>b.dataset.sort===state.sort); if(th) th.closest('th').setAttribute('aria-sort', state.dir==='desc'?'descending':'ascending')
      $$('.tabs a[data-sort]').forEach(a=>a.classList.toggle('on', a.dataset.sort===state.sort))
      $$('[data-col]',table).forEach(el=>{ el.hidden=!state.cols.includes(el.dataset.col) })
      $$('[data-col-toggle]').forEach(a=>a.classList.toggle('on', state.cols.includes(a.dataset.colToggle)))
      $$('[data-preset]').forEach(a=>a.classList.toggle('on', JSON.stringify(PRESETS[a.dataset.preset])===JSON.stringify(state.cols)))
      if(status) status.innerHTML = `${shown===rows.length?`Showing all ${rows.length} companies`:`<b>${shown} of ${rows.length}</b> companies match your filters`} · sorted by ${ {transparency:'prices published',reviews:'Google reviews',rating:'Google rating',days:'fastest published install',name:'name'}[state.sort] }${shown<rows.length?' · <a href="#" data-reset>Clear filters</a>':''}`
      $$('[data-job]').forEach(c=>c.classList.toggle('on', c.dataset.job===state.job)); $$('[data-area]').forEach(c=>c.classList.toggle('on', c.dataset.area===state.area)); $$('[data-must]').forEach(c=>{ const i=$('i',c); if(i) i.classList.toggle('on', state.must.has(c.dataset.must)) })
      const u=new URLSearchParams({job:state.job,area:state.area,sort:state.sort,dir:state.dir}); if(state.must.size) u.set('must',[...state.must].join(',')); if(JSON.stringify(state.cols)!==JSON.stringify(PRESETS.essentials)) u.set('cols',state.cols.join(',')); history.replaceState(null,'','?'+u)
      renderCards(sorted)
    }
    function renderCards(sorted){ if(!mcards) return; mcards.innerHTML = sorted.filter(r=>!r.hidden).map(r=>{ const name=r.dataset.name, id=r.dataset.id; const price=$('.pricecell',r).innerHTML, inst=$('[data-col=install]',r).innerHTML, war=$('[data-col=warranty]',r).innerHTML, badges=[...r.querySelectorAll('.co .badge')].map(b=>b.outerHTML).join(''); const det=dets[id]?dets[id].querySelector('.det3').outerHTML:''
        return `<article class="cc ${r.classList.contains('pub')?'pub':''}" data-id="${id}"><div class="head">${$('.mono-tile',r).outerHTML}<div><div class="name"><a href="${$('.co a',r).href}" style="color:var(--ink)">${name}</a></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${badges}</div></div></div><div class="small"><span class="star">★</span> <b>${r.dataset.rating}</b> · ${r.dataset.reviews} Google reviews</div><div class="facts"><div><b>${price}</b><span>${JOBN[state.job]}</span></div><div><b>${inst}</b><span>Install time</span></div><div><b>${war}</b><span>Warranty</span></div></div><div class="acts"><a href="#" class="btn o" data-sheet="${id}">See all details</a><label><input type="checkbox" data-cmp="${id}" ${cmp.includes(id)?'checked':''}> Compare</label></div><template data-sheet-content>${det}</template></article>` }).join('') }
    document.addEventListener('click', e=>{
      const t=e.target.closest('[data-job],[data-area],[data-must],[data-sort],[data-reset],.exp,[data-cols-menu],[data-preset],[data-col-toggle],[data-src-btn],[data-sheet]'); if(!t) return
      e.preventDefault()
      if(t.dataset.job) state.job=t.dataset.job
      else if(t.dataset.area) state.area=t.dataset.area
      else if(t.dataset.must){ state.must.has(t.dataset.must)?state.must.delete(t.dataset.must):state.must.add(t.dataset.must) }
      else if(t.dataset.sort!==undefined && t.dataset.sort!==''){ if(state.sort===t.dataset.sort && t.tagName==='BUTTON') state.dir=state.dir==='desc'?'asc':'desc'; else { state.sort=t.dataset.sort; state.dir=t.dataset.dir||(state.sort==='name'||state.sort==='days'?'asc':'desc') } }
      else if(t.hasAttribute('data-reset')){ state.must.clear(); state.area='ottawa' }
      else if(t.classList.contains('exp')){ const d=dets[t.dataset.for]; d.hidden=!d.hidden; t.textContent=d.hidden?'›':'⌄'; return }
      else if(t.hasAttribute('data-cols-menu')){ const p=$('[data-cols-panel]'); p.hidden=!p.hidden; return }
      else if(t.dataset.preset){ state.cols=PRESETS[t.dataset.preset].slice() }
      else if(t.dataset.colToggle){ const k=t.dataset.colToggle; state.cols = state.cols.includes(k) ? state.cols.filter(x=>x!==k) : [...state.cols,k] }
      else if(t.hasAttribute('data-src-btn')){ openSources(t); return }
      else if(t.dataset.sheet){ openSheet(t); return }
      apply()
    })
    function openSources(btn){ $('.pop')?.remove(); const r=btn.closest('tr'); const src=JSON.parse(r.dataset.sources); const pop=document.createElement('div'); pop.className='pop'; pop.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>Sources for ${r.dataset.name}</b><button class="src-btn" data-pop-close>✕</button></div><p class="meta" style="margin:4px 0 8px">Every value read on ${window.RR_DATA.verified} by M.L. Next check ${window.RR_DATA.next||''}.</p><table><tbody>${src.map(([p,v,u])=>`<tr><td style="white-space:nowrap;color:var(--pewter)">${p}</td><td style="white-space:normal">${v}</td><td><a href="${u}" rel="noopener">↗</a></td></tr>`).join('')}</tbody></table>`; document.body.appendChild(pop); const b=btn.getBoundingClientRect(); pop.style.top=(window.scrollY+b.bottom+6)+'px'; pop.style.left=Math.max(12, Math.min(window.innerWidth-372, window.scrollX+b.right-360))+'px'; pop.addEventListener('click',e=>{ if(e.target.closest('[data-pop-close]')) pop.remove() }); setTimeout(()=>document.addEventListener('click', function h(e){ if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('click',h) } }),0) }
    function openSheet(t){ const card=t.closest('.cc'); const tpl=$('template[data-sheet-content]',card); $('.sheet')?.remove(); $('.scrim')?.remove(); const scrim=document.createElement('div'); scrim.className='scrim'; scrim.style.cssText='position:fixed;inset:0;background:rgba(31,27,23,.4);z-index:65'; scrim.setAttribute('data-sheet-close',''); const sh=document.createElement('div'); sh.className='sheet'; sh.innerHTML=`<div class="handle"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b>${$('.name',card).textContent}</b><button class="src-btn" data-sheet-close>Close</button></div>${tpl?tpl.innerHTML:''}`; document.body.append(scrim, sh) }
    const md=$('[data-copy-md]'); if(md) md.addEventListener('click', e=>{ e.preventDefault(); const hs=$$('thead th',table).filter(h=>!h.hidden).slice(0,-1).map(h=>h.textContent.trim().replace(/\s+/g,' ')); const body=rows.filter(r=>!r.hidden).map(r=>$$('td',r).filter(td=>!td.hidden).slice(0,-1).map(td=>{const c=td.cloneNode(true); c.querySelectorAll('.badge,.mono-tile,sup').forEach(x=>x.remove()); return c.textContent.trim().replace(/\s+/g,' ')}).join(' | ')); navigator.clipboard?.writeText('| '+hs.join(' | ')+' |\n|'+hs.map(()=>'---').join('|')+'|\n'+body.map(b=>'| '+b+' |').join('\n')); md.textContent='Copied ✓' })
    apply()
  }
  document.addEventListener('click', e=>{ if(e.target.closest('[data-sheet-close]')){ e.preventDefault(); $('.sheet')?.remove(); $('.scrim')?.remove() } })

  // ---------- compare page: differences only ----------
  const diff=$('[data-diff-toggle]'); if(diff) diff.addEventListener('change', ()=>{ $$('tr[data-same]').forEach(r=>r.hidden=diff.checked) })
})()

// Ask the guide
window.askGuide = function(root){
  const $ = (s, r=root) => r.querySelector(s)
  const data = window.RR_DATA; if(!data) return
  const JOBK = [['walk-in','walkin'],['walk in','walkin'],['tub to shower','tts'],['tub-to-shower','tts'],['conversion','tts'],['shower','shower'],['bathtub','tub'],['tub','tub'],['full','full'],['complete','full'],['renovation','full']]
  const AREAS = ['kanata','nepean','barrhaven','orleans','orléans','gatineau','manotick','stittsville','ottawa']
  const show = n => { root.querySelectorAll('[data-state]').forEach(s=>s.hidden = s.dataset.state!==String(n)); root.scrollIntoView({behavior:'smooth',block:'start'}) }
  root.addEventListener('click', e=>{
    const b = e.target.closest('[data-go]'); if(!b) return; e.preventDefault()
    const to = b.dataset.go
    if(to==='2'){
      const qtext = ($('textarea').value||'').toLowerCase()
      const job = (JOBK.find(([k])=>qtext.includes(k))||[null,'tts'])[1]
      const area = AREAS.find(a=>qtext.includes(a))||'ottawa'
      const cos = data.companies.filter(c=> area==='ottawa' || c.areas.toLowerCase().includes(area.replace('é','e')))
      const pub = cos.filter(c=>c.price[job]), rest = cos.filter(c=>!c.price[job])
      const JOBN = data.jobs[job]
      const val = c => { const p=c.price[job]; return p.complete ? p.complete.v : p.v }
      $('[data-q]').textContent = '"'+($('textarea').value||'')+'"'
      const w = n => ['No companies','One company','Two companies','Three companies','Four companies','Five companies'][n]||n+' companies'
      const lowest = pub.map(c=>val(c)).sort((a,b)=>parseInt(a.replace(/,/g,'').match(/\d+/)[0])-parseInt(b.replace(/,/g,'').match(/\d+/)[0]))[0]
      $('[data-answer]').innerHTML = pub.length ? `${w(pub.length)} ${pub.length===1?'publishes':'publish'} a ${JOBN.toLowerCase()} price and ${pub.length===1?'serves':'serve'} ${area[0].toUpperCase()+area.slice(1)}: ${pub.map(c=>c.name).join(', ')}. The lowest published figure is ${lowest}. ${rest.length} more serve the area without a published ${JOBN.toLowerCase()} price.` : `No company publishes a ${JOBN.toLowerCase()} price for ${area}. ${cos.length} companies serve the area; ask each for a written figure.`
      const list = [...pub, ...rest].slice(0,3)
      $('[data-rows]').innerHTML = list.map(c=>`<tr class="${c.publisher?'pub':''}"><td style="height:44px"><a href="${data.root}companies/${c.id}.html" style="color:var(--ink)">${c.name}</a>${c.publisher?' <span class="badge ox">Publisher</span>':''}</td>${c.price[job]?`<td class="n" style="height:44px">${val(c)}</td>`:`<td class="n" style="height:44px"><span class="dash">—</span></td>`}<td class="n" style="height:44px">${c.google.r.toFixed(1)} (${c.google.n})</td><td class="n" style="height:44px;font-size:12px">${data.verified}</td></tr>`).join('')
      $('[data-src]').textContent = `Sources: Table 1 rows ${list.map(c=>c.row).join(', ')} - verified ${data.verified}`
      $('[data-contacts]').innerHTML = list.map(c=>`<li>${c.name}: ${c.phone} - <a href="https://${c.site}" rel="noopener">${c.site} ↗</a></li>`).join('')
      root.querySelectorAll('[data-confirm-rows]').forEach(el=>el.innerHTML = list.map(c=>`<tr class="${c.publisher?'pub':''}"><td style="height:44px">${c.name}${c.publisher?' <span class="badge ox">Publisher</span>':''}</td><td style="height:44px"><a href="https://${c.site}" rel="noopener">Visit website ↗</a></td></tr>`).join(''))
    }
    if(to==='4'){ const em = $('[name=email]').value||'you@example.com'; $('[data-email]').textContent = em.replace(/^(.).*(@.*)$/,'$1***$2'); $('[data-optin]').hidden = !$('[name=optin]').checked }
    show(to)
  })
  root.addEventListener('change', e=>{ if(e.target.name==='optin'){ const s=$('[data-submit]'); s.textContent = e.target.checked ? 'Send my shortlist and send my details to Bytown' : 'Send my shortlist' } })
  root.addEventListener('click', e=>{ const t=e.target.closest('[data-toggle]'); if(!t) return; e.preventDefault(); const el=$('#'+t.dataset.toggle); el.hidden=!el.hidden })
  show(1)
}
