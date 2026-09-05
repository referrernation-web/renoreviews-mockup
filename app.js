// RenoReviews.ca prototype behaviour. State lives in the URL (?job=&area=&sort=); tables are server-rendered and work without this file.
(function(){
  const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)]
  const q = new URLSearchParams(location.search)
  const state = { job: q.get('job')||'tts', area: (q.get('area')||'ottawa').toLowerCase(), sort: q.get('sort')||'transparency', dir: q.get('dir')||'desc', must: new Set((q.get('must')||'').split(',').filter(Boolean)) }
  const JOBN = {tts:'Tub-to-shower conversion',shower:'Shower installation',tub:'Bathtub replacement',walkin:'Walk-in tubs',full:'Full bathroom renovation'}
  const table = $('table[data-master]'); if(!table) return
  const tbody = $('tbody', table), rows = $$('tr.row', tbody), dets = Object.fromEntries($$('tr.details', tbody).map(d=>[d.dataset.for,d]))
  const status = $('#status'), priceTh = $('th[data-price]', table)

  function apply(){
    // job → price column
    if(priceTh) priceTh.querySelector('small').textContent = JOBN[state.job]
    rows.forEach(r=>{ const p = JSON.parse(r.dataset.prices)[state.job]; const td = $('.pricecell', r); if(!td) return
      if(p){ td.className='n pricecell'; td.textContent=p } else { td.className='np pricecell'; td.textContent='Not published' } })
    // filters
    let shown = 0
    rows.forEach(r=>{
      let ok = state.area==='ottawa' || r.dataset.areas.includes(state.area)
      if(state.must.has('oneday') && r.dataset.oneday!=='1') ok=false
      if(state.must.has('walkin') && r.dataset.walkin!=='1') ok=false
      if(state.must.has('bbb') && r.dataset.bbbacc!=='1') ok=false
      r.hidden = !ok; if(dets[r.dataset.id]) dets[r.dataset.id].hidden = true; if(ok) shown++
    })
    // sort
    const key = r => state.sort==='name' ? r.dataset.name.toLowerCase() : parseFloat(r.dataset[state.sort]||0)
    const sorted = [...rows].sort((a,b)=>{ const x=key(a), y=key(b); const c = typeof x==='string' ? x.localeCompare(y) : (x-y) || (parseFloat(a.dataset.reviews)-parseFloat(b.dataset.reviews)) || (parseFloat(a.dataset.rating)-parseFloat(b.dataset.rating)); return state.dir==='desc' ? -c : c })
    sorted.forEach(r=>{ tbody.appendChild(r); if(dets[r.dataset.id]) tbody.appendChild(dets[r.dataset.id]) })
    $$('th[data-sort]', table).forEach(th=>th.classList.toggle('sort', th.dataset.sort===state.sort))
    let empty = $('tr.empty', tbody); if(!empty){ empty = document.createElement('tr'); empty.className='empty'; empty.innerHTML='<td colspan="15" style="color:var(--pewter);height:48px">No company matches every must-have. <a href="#" data-reset>Clear the must-haves</a> to see all 8.</td>'; tbody.appendChild(empty) }
    empty.hidden = shown>0; tbody.appendChild(empty)
    if(status) status.innerHTML = `Showing ${shown} of ${rows.length} - sorted by ${state.sort==='name'?'name A-Z':state.sort==='rating'?'Google rating':state.sort==='transparency'?'prices published, most first':'Google reviews, most first'} - <a href="#" data-sort="reviews">Sort by reviews</a> - <a href="#" data-sort="name">Sort A-Z</a> - <a href="#" data-reset>Reset</a>`
    // chips
    $$('[data-job]').forEach(c=>c.classList.toggle('on', c.dataset.job===state.job))
    $$('[data-area]').forEach(c=>c.classList.toggle('on', c.dataset.area===state.area))
    $$('[data-must]').forEach(c=>$('i',c).classList.toggle('on', state.must.has(c.dataset.must)))
    const u = new URLSearchParams({job:state.job, area:state.area, sort:state.sort}); if(state.must.size) u.set('must',[...state.must].join(',')); history.replaceState(null,'','?'+u)
  }
  document.addEventListener('click', e=>{
    const t = e.target.closest('[data-job],[data-area],[data-must],[data-sort],[data-reset],.exp'); if(!t) return
    e.preventDefault()
    if(t.dataset.job) state.job=t.dataset.job
    else if(t.dataset.area) state.area=t.dataset.area
    else if(t.dataset.must){ state.must.has(t.dataset.must) ? state.must.delete(t.dataset.must) : state.must.add(t.dataset.must) }
    else if(t.dataset.sort){ if(state.sort===t.dataset.sort && t.tagName==='TH') state.dir = state.dir==='desc'?'asc':'desc'; else { state.sort=t.dataset.sort; state.dir = state.sort==='name'?'asc':'desc' } }
    else if(t.hasAttribute('data-reset')){ state.must.clear(); state.area='ottawa'; state.sort='transparency'; state.dir='desc' }
    else if(t.classList.contains('exp')){ const d=dets[t.dataset.for]; d.hidden=!d.hidden; t.textContent=d.hidden?'›':'⌄'; return }
    apply()
  })
  // copy as markdown
  const md = $('[data-copy-md]'); if(md) md.addEventListener('click', e=>{ e.preventDefault(); const hs=$$('thead th',table).slice(0,-1).map(h=>h.childNodes[0].textContent.trim()); const body=rows.filter(r=>!r.hidden).map(r=>$$('td',r).slice(0,-1).map(td=>{const c=td.cloneNode(true); c.querySelectorAll('sup,.tag,.meta').forEach(x=>x.remove()); return c.textContent.trim()}).join(' | ')); navigator.clipboard?.writeText('| '+hs.join(' | ')+' |\n|'+hs.map(()=>'---').join('|')+'|\n'+body.map(b=>'| '+b+' |').join('\n')); md.textContent='Copied ✓' })
  apply()
})()

// Ask the guide: template-composed answers from the table on the page (or the embedded dataset on ask.html)
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
      $('[data-q]').textContent = '"'+($('textarea').value||'')+'"'
      const w = n => ['No companies','One company','Two companies','Three companies','Four companies','Five companies'][n]||n+' companies'
      $('[data-answer]').innerHTML = pub.length ? `${w(pub.length)} ${pub.length===1?'publishes':'publish'} a ${JOBN.toLowerCase()} price and ${pub.length===1?'serves':'serve'} ${area[0].toUpperCase()+area.slice(1)}: ${pub.map(c=>c.name).join(', ')}. The lowest published start is ${pub.map(c=>c.price[job].v).sort((a,b)=>parseInt(a.replace(/,/g,'').match(/\d+/)[0])-parseInt(b.replace(/,/g,'').match(/\d+/)[0]))[0]}. ${rest.length} more serve the area without a published ${JOBN.toLowerCase()} price.` : `No company publishes a ${JOBN.toLowerCase()} price for ${area}. ${cos.length} companies serve the area; ask each for a written figure.`
      const list = [...pub, ...rest].slice(0,3)
      $('[data-rows]').innerHTML = list.map(c=>`<tr class="${c.publisher?'pub':''}"><td style="height:44px"><a href="${data.root}companies/${c.id}.html" style="color:var(--ink)">${c.name}</a>${c.publisher?'<span class="tag">Publisher</span>':''}</td>${c.price[job]?`<td class="n" style="height:44px">${c.price[job].v}</td>`:`<td class="np" style="height:44px">Not published</td>`}<td class="n" style="height:44px">${c.google.r.toFixed(1)} (${c.google.n})</td><td class="n" style="height:44px;font-size:12px">${data.verified}</td></tr>`).join('')
      $('[data-src]').textContent = `Sources: Table 1 rows ${list.map(c=>c.row).join(', ')} - verified ${data.verified}`
      $('[data-contacts]').innerHTML = list.map(c=>`<li>${c.name}: ${c.phone} - <a href="https://${c.site}" rel="noopener">${c.site} ↗</a></li>`).join('')
      root.querySelectorAll('[data-confirm-rows]').forEach(el=>el.innerHTML = list.map(c=>`<tr class="${c.publisher?'pub':''}"><td style="height:44px">${c.name}${c.publisher?'<span class="tag">Publisher</span>':''}</td><td style="height:44px"><a href="https://${c.site}" rel="noopener">Visit website ↗</a></td></tr>`).join(''))
    }
    if(to==='4'){ const em = $('[name=email]').value||'you@example.com'; $('[data-email]').textContent = em.replace(/^(.).*(@.*)$/,'$1***$2'); $('[data-optin]').hidden = !$('[name=optin]').checked }
    show(to)
  })
  root.addEventListener('change', e=>{ if(e.target.name==='optin'){ const s=$('[data-submit]'); s.textContent = e.target.checked ? 'Send my shortlist and send my details to Bytown' : 'Send my shortlist' } })
  root.addEventListener('click', e=>{ const t=e.target.closest('[data-toggle]'); if(!t) return; e.preventDefault(); const el=$('#'+t.dataset.toggle); el.hidden=!el.hidden })
  show(1)
}
