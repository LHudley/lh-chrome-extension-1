const mdQuery = document.getElementById('medQuery');
const resultrx = document.getElementById('resultRx');
const resultuse = document.getElementById('resultUse');
const errBox = document.getElementById('error');
const statuss = document.getElementById('status');
const resName = document.getElementById('generic');
const resSynonym = document.getElementById('synonym');
const resRxCui= document.getElementById('rxcui');
const resUsage = document.getElementById('medUsesText');


function showStatus(text){
  statuss.textContent = text;
  statuss.classList.remove('hidden');
}
function showError(text){
  errBox.textContent = text;
  errBox.classList.remove('hidden');
  resultrx.classList.add('hidden');
  statuss.classList.add('hidden');
  resultuse.classList.add('hidden');


}

function clearError(){
  errBox.classList.add('hidden');
  errBox.textContent = '';
}

function hideAllResults() {
  // Hide UI sections
  resultrx.classList.add("hidden");
  resultuse.classList.add("hidden");
  errBox.classList.add("hidden");
  statuss.classList.add("hidden");

   // Clear previous data
  resName.textContent = "";
  resSynonym.textContent = "";
  resRxCui.textContent = "";
  document.getElementById("usageText").innerHTML = "";
  document.getElementById("simpleUsageText").innerHTML = "";
}

 
  

function showResult({name, rxcui, synonym}){
  resName.textContent = name || '—';
  resRxCui.textContent = rxcui || '—';
  resSynonym.textContent = synonym || '—';
  resultrx.classList.remove('hidden');
  resultuse.classList.remove('hidden');
  statuss.classList.add('hidden');
  clearError();
}

function showDetails(clinical, wiki){
  document.getElementById("usageText").innerHTML = clinical;
  document.getElementById("simpleUsageText").innerHTML = wiki;
  resultuse.classList.remove('hidden');

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

    return {
      name: cp.name,
      rxcui: cp.rxcui,
      synonym: cp.synonym || ''
      
    };

  }catch(err){
    throw err;
  }
}

 async function getMedicationUsage(drugName) {
  const encoded = encodeURIComponent(drugName.trim());
  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"+openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("OpenFDA error");

    const data = await res.json();
    const item = data.results?.[0];

    //Choose best available usage field
     const usage =
      item?.indications_and_usage?.[0] ||
      item?.purpose?.[0] ||
      item?.description?.[0] ||
      "No usage information found."; 

    return usage;

  } catch (err) {
    return "Error retrieving medication usage.";
  }
} 

 

function getFirstUsageSentence(text) {
  if (!text) return "No usage information available.";

 // Normalize spaces and newlines
  let clean = text.replace(/\s+/g, " ").trim();

  // Find the section header (case-insensitive)
  let index = clean.toUpperCase().indexOf("INDICATIONS AND USAGE");

  if (index === -1) {
    // Fallback: return first sentence ONLY
    const match = clean.match(/[^.!?]*[.!?]/);
    return match ? match[0].trim() : clean;
  }

  // Get text starting at this section
  let sectionText = clean.substring(index);

  // Remove the header from the text
  sectionText = sectionText.replace(/INDICATIONS AND USAGE[:]?/i, "").trim();

  // Extract the first sentence after the header
  const firstSentenceMatch = sectionText.match(/[^.!?]*[.!?]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : sectionText;

  // Return with formatted header
  return firstSentence;
}

async function getPageFirstSentence(pageTitle) {
    const apiUrl = 'https://en.wikipedia.org/w/api.php';
    const params = {
        action: 'query',
        prop: 'extracts',
        titles: pageTitle,
        exintro: 1,       // Return only the introductory section
        exsentences: 1,   // Return only the first sentence
        explaintext: 1,   // Return plain text
        format: 'json',
        origin: '*'       // Required for CORS
    };

    const url = new URL(apiUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const response = await fetch(url);
        const data = await response.json();

        // The structure is usually data.query.pages.{pageId}.extract
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const extract = pages[pageId].extract;
        
        if (extract) {
            console.log(`First sentence of "${pageTitle}":`);
            console.log(extract.trim());
            return extract.trim();
        } else {
            console.log(`Could not find an extract for "${pageTitle}".`);
            return null;
        }

    } catch (error) {
        console.error('Error fetching data from Wikipedia API:', error);
        return null;
    }
}

async function searchUpSimpleUse(drugName) {
  const encoded = encodeURIComponent(drugName.trim());
  const url =`https://en.wikipedia.org/w/api.php?action=parse&page=${encoded}&prop=sections&format=json&origin=*`;
   
  const secRes = await fetch(url);
  const secData = await secRes.json();

  if (!secData.parse) {
    return "No Wikipedia page found.";
  }

 const title = secData.parse.title;
  const sections = secData.parse.sections;

  // Find the section index for "Medical uses"
  let medicalIndex = null;
  for (const sec of sections) {
    if (sec.line.toLowerCase().includes("medical uses")) {
      medicalIndex = sec.index;
      break;
    }
  }

  if (!medicalIndex) return await getPageFirstSentence(title) || "Unable to find simple summary.";

  // Fetch ONLY that section's HTML
  const contentURL = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${medicalIndex}&format=json&origin=*`;
  const contentRes = await fetch(contentURL);
  const contentData = await contentRes.json();

  if (!contentData.parse) return "Could not load usage content.";

  // Raw HTML of the section
  const html = contentData.parse.text["*"];

  //Convert HTML → Text
  const div = document.createElement("div");
  div.innerHTML = html;

  // Wikipedia always puts *real text* inside <p> tags beneath headers
  const paragraphs = Array.from(div.querySelectorAll("p"))
    .map(p => p.textContent.trim())
    .filter(p => p.length > 0); // remove empty lines

  if (paragraphs.length === 0) return "No medical use summary available.";
  

  // Clean the text: remove [1], [citation needed], [edit]
  let cleaned = paragraphs[0]
    .replace(/\[[^\]]*\]/g, "") // remove [edit], [1], [2], [note]
    .replace(/\s+/g, " ")       // normalize whitespace
    .trim();

  return cleaned;
}





//------------------------------------------------------------------------------------------------------
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

   

    
    document.getElementById("usageText").textContent = "Loading...";
    document.getElementById("simpleUsageText").textContent = "Loading..."; 
  

    const rawUsageText = await getMedicationUsage(q);

  
  
    const firstSentence = getFirstUsageSentence(rawUsageText.usaageText || rawUsageText);

    const simpmedUses = await searchUpSimpleUse(q);



    showDetails(firstSentence, simpmedUses);
  

  } catch (e) {
    showError('No results found or network error.');
  }
});

mdQuery.addEventListener("input", () => {
  if (mdQuery.value === "") {
    hideAllResults();  // clear + hide everything
  }
});


