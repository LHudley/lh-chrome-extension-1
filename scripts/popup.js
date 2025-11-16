const mdQuery = document.getElementById('medQuery');
const resultrx = document.getElementById('resultRx');
const resultimg = document.getElementById('resultImg');
const resultuse = document.getElementById('resultUse');
const errBox = document.getElementById('error');
// const searchClick = document.getElementById('searchClick');
const statuss = document.getElementById('status');
const resName = document.getElementById('generic');
const resSynonym = document.getElementById('synonym');
const resRxCui= document.getElementById('rxcui');

/* searchClick.addEventListener('click', () => {
  const q = mdQuery.value.trim();
  if (!q) return showError('Enter a medication name.');
  doLookup(q);
});
 */
function showStatus(text){
  statuss.textContent = text;
}
function showError(text){
  errBox.textContent = text;
  errBox.classList.remove('hidden');
  resultrx.classList.add('hidden');
  statuss.classList.add('hidden');
  resultimg.classList.add('hidden');
  resultuse.classList.add('hidden');

}

function clearError(){
  errBox.classList.add('hidden');
  errBox.textContent = '';
}

function showResult({name, rxcui, synonym}){
  resName.textContent = name || '—';
  resRxCui.textContent = rxcui || '—';
  resSynonym.textContent = synonym || '—';
  resultrx.classList.remove('hidden');
  resultimg.classList.remove('hidden');
  resultuse.classList.remove('hidden');
  statuss.classList.add('hidden');
  clearError();
}

// Fetch from RxNav: /REST/drugs.json?name=...
async function fetchDrugByName(name){
  const encoded = encodeURIComponent(name.trim());
  const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encoded}`;
  showStatus('Searching RxNav...');
  try{
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Network response ${r.status}`);
    const data = await r.json();
    // navigate: drugGroup.conceptGroup[0].conceptProperties[0]
    const dg = data.drugGroup;
    if (!dg || !dg.conceptGroup) {
      throw new Error('No results');
    }
    // find first conceptGroup with conceptProperties
    let cp = null;
    for (const cg of dg.conceptGroup){
      if (cg.conceptProperties && cg.conceptProperties.length){
        cp = cg.conceptProperties[0];
        break;
      }
    }
    if (!cp) throw new Error('No matching concept found');

    // cp typically has name, rxcui, synonym (maybe)
    return {
      name: cp.name,
      rxcui: cp.rxcui,
      synonym: cp.synonym || ''
    };
  }catch(err){
    throw err;
  }
}


// Run search when user presses ENTER
mdQuery.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;

  e.preventDefault();
  const q = mdQuery.value.trim();
  if (!q) return showError('Enter a drug name.');

  clearError();
  showStatus('Looking up: ' + q);

  try {
    const info = await fetchDrugByName(q);
    showResult(info);
  } catch (e) {
    showError('No results found or network error.');
  }
});

