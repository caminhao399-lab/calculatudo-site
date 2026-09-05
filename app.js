const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

function money(v){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number.isFinite(Number(v)) ? Number(v) : 0);
}

// Accepts common Brazilian and international decimal formats.
function num(v){
  let s=String(v ?? '').trim().replace(/\s/g,'');
  if(!s) return 0;
  const hasComma=s.includes(','), hasDot=s.includes('.');
  if(hasComma && hasDot){
    if(s.lastIndexOf(',') > s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  }else if(hasComma){
    s=s.replace(',','.');
  }
  const n=Number(s);
  return Number.isFinite(n) ? n : 0;
}

function percent(v){
  return `${(Number(v)||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`;
}

function setupTheme(){
  const b=$('#themeToggle');
  if(!b) return;
  const saved=localStorage.getItem('ct-theme');
  if(saved==='light') document.body.classList.add('light');
  b.textContent=document.body.classList.contains('light')?'☀':'☾';
  b.addEventListener('click',()=>{
    document.body.classList.toggle('light');
    const light=document.body.classList.contains('light');
    localStorage.setItem('ct-theme',light?'light':'dark');
    b.textContent=light?'☀':'☾';
  });
}

const CATEGORY_MAP={financas:'Finanças',casa:'Casa',veiculos:'Veículos',saude:'Saúde',educacao:'Matemática'};

function setupSearch(){
  const input=$('#siteSearch');
  const cards=$$('.tool-card[data-category]');
  if(!input || !cards.length) return;
  const params=new URLSearchParams(location.search);
  const q0=params.get('q')||'';
  const cat0=params.get('categoria')||'';
  input.value=q0;
  function apply(){
    const q=input.value.toLowerCase().trim();
    const cat=CATEGORY_MAP[cat0]||'';
    let shown=0;
    cards.forEach(c=>{
      const text=c.innerText.toLowerCase();
      const okQ=!q||text.includes(q);
      const okCat=!cat||c.dataset.category===cat;
      c.hidden=!(okQ&&okCat);
      if(okQ&&okCat) shown++;
    });
    let empty=$('#emptySearchState');
    if(!shown){
      if(!empty){
        empty=document.createElement('div');
        empty.id='emptySearchState'; empty.className='empty-state';
        $('#toolGrid')?.appendChild(empty);
      }
      empty.textContent=q?`Nenhuma calculadora encontrada para “${q}”.`:'Nenhuma calculadora nesta categoria.';
      empty.hidden=false;
    }else if(empty) empty.hidden=true;
  }
  input.addEventListener('input',apply);
  apply();
}

function setupHomeSearch(){
  const input=$('#homeSearch');
  if(!input) return;
  const go=()=>{
    const q=input.value.trim();
    location.href=new URL('calculadoras/'+(q?`?q=${encodeURIComponent(q)}`:''),document.baseURI).href;
  };
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go();}});
}

function juros(){
  const vi=Math.max(0,num($('#vi')?.value));
  const aporte=Math.max(0,num($('#aporte')?.value));
  const taxa=Math.max(-99.99,num($('#taxa')?.value))/100;
  const meses=Math.max(0,Math.floor(num($('#meses')?.value)));
  const total=vi*Math.pow(1+taxa,meses)+(taxa?aporte*((Math.pow(1+taxa,meses)-1)/taxa):aporte*meses);
  const aportes=aporte*meses;
  const juros=total-vi-aportes;
  $('#resultado').textContent=money(total);
  $('#rInicial').textContent=money(vi);
  $('#rAportes').textContent=money(aportes);
  $('#rJuros').textContent=money(juros);
  drawChart(total,meses,vi,aporte,taxa);
}

function drawChart(total,meses,vi,aporte,taxa){
  const svg=$('#growthChart');
  if(!svg) return;
  const w=420,h=140,p=8, maxM=Math.max(meses,1);
  const pts=[];
  for(let i=0;i<=Math.min(meses,24);i++){
    const m=meses<=24?i:Math.round(i*meses/24);
    const v=vi*Math.pow(1+taxa,m)+(taxa?aporte*((Math.pow(1+taxa,m)-1)/taxa):aporte*m);
    pts.push([p+(w-2*p)*(m/maxM),h-p-(h-2*p)*(v/Math.max(total,1))]);
  }
  const poly=pts.map(x=>x.join(',')).join(' ');
  svg.innerHTML=`<polyline fill="none" stroke="currentColor" stroke-width="4" points="${poly}"/><polyline fill="none" stroke="currentColor" stroke-width="1" opacity=".18" points="${pts.map(([x])=>`${x},${h-p}`).join(' ')}"/>`;
}

function setupHomeCalc(){
  const f=$('#heroCalc');
  if(!f) return;
  f.addEventListener('submit',e=>{e.preventDefault();juros();});
  ['vi','aporte','taxa','meses'].forEach(id=>$('#'+id)?.addEventListener('input',juros));
  juros();
}

function showAnswer(result,detail){
  const box=$('#answer');
  if(!box) return;
  box.hidden=false;
  $('#answer strong').textContent=result;
  $('#answer p').textContent=detail;
}

function calcPage(){
  const type=document.body.dataset.calc;
  if(!type) return;
  const b=$('#calculate');
  if(!b) return;
  const run=()=>{
    let result='—',detail='Preencha os valores para calcular.';
    switch(type){
      case'porcentagem':{
        const v=num($('#v').value),p=num($('#p').value),r=v*p/100;
        result=money(r); detail=`${percent(p)} de ${money(v)} é ${money(r)}.`; break;
      }
      case'regra-de-tres':{
        const a=num($('#a').value),b=num($('#b').value),c=num($('#c').value);
        const r=a?b*c/a:0;
        result=r.toLocaleString('pt-BR',{maximumFractionDigits:6}); detail=`Se ${a} corresponde a ${b}, então ${c} corresponde a ${result}.`; break;
      }
      case'imc':{
        const peso=Math.max(0,num($('#peso').value)),altura=Math.max(0,num($('#altura').value))/100,imc=altura?peso/(altura*altura):0;
        result=imc.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
        detail=imc<18.5?'Abaixo de 18,5: abaixo do peso.':imc<25?'Entre 18,5 e 24,9: faixa considerada adequada para adultos.':imc<30?'Entre 25 e 29,9: acima da faixa de referência.':'30 ou mais: faixa de obesidade. Não é diagnóstico.'; break;
      }
      case'combustivel':{
        const km=Math.max(0,num($('#km').value)),cons=Math.max(0,num($('#cons').value)),preco=Math.max(0,num($('#preco').value)),litros=cons?km/cons:0;
        result=money(litros*preco); detail=`Você consumirá aproximadamente ${litros.toLocaleString('pt-BR',{maximumFractionDigits:2})} L.`; break;
      }
      case'custo-de-viagem':{
        const km=Math.max(0,num($('#km').value)),cons=Math.max(0,num($('#cons').value)),preco=Math.max(0,num($('#preco').value)),pedagios=Math.max(0,num($('#pedagios').value)),litros=cons?km/cons:0;
        result=money(litros*preco+pedagios); detail=`Combustível: ${money(litros*preco)} + pedágios: ${money(pedagios)}.`; break;
      }
      case'financiamento':{
        const pv=Math.max(0,num($('#pv').value)),taxa=Math.max(0,num($('#taxa').value))/100,meses=Math.max(1,Math.floor(num($('#meses').value)));
        const parcela=taxa?pv*(taxa*Math.pow(1+taxa,meses))/(Math.pow(1+taxa,meses)-1):pv/meses;
        result=money(parcela); detail=`Estimativa pela Tabela Price para ${meses} meses, sem seguros, tarifas ou outros encargos.`; break;
      }
      case'piso':{
        const area=Math.max(0,num($('#area').value)),perda=Math.max(0,num($('#perda').value));
        result=`${(area*(1+perda/100)).toLocaleString('pt-BR',{maximumFractionDigits:2})} m²`; detail=`Área base: ${area.toLocaleString('pt-BR')} m² + ${percent(perda)} de margem.`; break;
      }
      case'tinta':{
        const area=Math.max(0,num($('#area').value)),rendimento=Math.max(0,num($('#rendimento').value)),demãos=Math.max(1,Math.floor(num($('#demao').value))),litros=rendimento?area*demãos/rendimento:0;
        result=`${litros.toLocaleString('pt-BR',{maximumFractionDigits:1})} L`; detail=`Estimativa para ${demãos} demão(ões), usando o rendimento informado.`; break;
      }
      case'media':{
        const vals=$('#valores').value.split(/[,;\s]+/).map(num).filter(v=>Number.isFinite(v));
        const m=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0; result=m.toLocaleString('pt-BR',{maximumFractionDigits:4}); detail=`Foram considerados ${vals.length} valor(es).`; break;
      }
      case'temperatura':{
        const v=num($('#temp').value),from=$('#from').value,to=$('#to').value;
        let c=from==='C'?v:from==='F'?(v-32)*5/9:v-273.15;
        const out=to==='C'?c:to==='F'?c*9/5+32:c+273.15;
        result=`${out.toLocaleString('pt-BR',{maximumFractionDigits:2})} °${to}`; detail=`Conversão de ${v.toLocaleString('pt-BR')} °${from} para °${to}.`; break;
      }
      case'juros-compostos':{
        const vi=Math.max(0,num($('#vi').value)),aporte=Math.max(0,num($('#aporte').value)),taxa=Math.max(-99.99,num($('#taxa').value))/100,meses=Math.max(0,Math.floor(num($('#meses').value)));
        const total=vi*Math.pow(1+taxa,meses)+(taxa?aporte*((Math.pow(1+taxa,meses)-1)/taxa):aporte*meses);
        result=money(total); detail=`Valor inicial ${money(vi)} + aportes de ${money(aporte)} por ${meses} meses.`; break;
      }
    }
    showAnswer(result,detail);
  };
  b.addEventListener('click',run);
  $$('.calculator-main input, .calculator-main select').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();}}));
}

setupTheme();
setupSearch();
setupHomeSearch();
setupHomeCalc();
calcPage();
