const tabsContainer = document.querySelector(".container");
const tabsList = tabsContainer.querySelector("ul");
const tabButtons = tabsList.querySelectorAll("a");
const tabPanels = tabsContainer.querySelectorAll(".panels > div");

tabButtons.forEach((tab, index) => {
    if (index ===0){

    }
    else{
        
        tabPanels[index].setAttribute("hidden", "")
    }
});

tabsContainer.addEventListener("click", (e) => {
    const clickedTab = e.target.closest("a");

    if(!clickedTab) return;
    e.preventDefault();

    const activePanelId = clickedTab.getAttribute('href');
    const activePanel = tabsContainer.querySelector(activePanelId);

    tabPanels.forEach((panel) =>{
        panel.setAttribute("hidden", true);
    });
    activePanel.removeAttribute("hidden")
});