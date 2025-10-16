// Overview Tab Functions

// Load and display data set for overview
async function loadDataSet(dataSetKey, buttonElement) {
    STATE.currentDataSet = dataSetKey;
    
    updateButtonStates(buttonElement, '.data-selector');
    
    showStatus('loading-status', `Loading ${buttonElement.textContent} data...`);
    document.getElementById('results-container').classList.add('hidden');

    try {
        if (!STATE.overviewData || !STATE.overviewData[dataSetKey]) {
            throw new Error('Overview data not loaded or dataset not found');
        }
        
        STATE.currentData = STATE.overviewData[dataSetKey];
        displayOverview();
        
        hideStatus('loading-status');
        document.getElementById('results-container').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading data:', error);
        showStatus('loading-status', `Error loading data: ${error.message}`, 'error');
    }
}

// Display overview data
function displayOverview() {
    if (!STATE.currentData) return;

    const topSets = STATE.currentData.topSets || [];
    const bottomSets = STATE.currentData.bottomSets || [];
    const topTeams = STATE.currentData.topTeams || [];

    displayTopSets(topSets);
    displayBottomSets(bottomSets);
    displayTopTeams(topTeams);
}

// Display top 20 sets
function displayTopSets(topSets) {
    const topList = document.getElementById('top-sets-list');
    topList.innerHTML = '';
    
    topSets.forEach((set, index) => {
        const li = createSetListItem(set, `top-${index}`, true);
        topList.appendChild(li);
    });
}

// Display bottom 20 sets
function displayBottomSets(bottomSets) {
    const bottomList = document.getElementById('bottom-sets-list');
    bottomList.innerHTML = '';
    
    bottomSets.forEach((set, index) => {
        const li = createSetListItem(set, `bottom-${index}`, false);
        bottomList.appendChild(li);
    });
}

// Display top 20 teams
function displayTopTeams(topTeams) {
    const teamsList = document.getElementById('top-teams-list');
    teamsList.innerHTML = '';
    
    topTeams.forEach((team, index) => {
        const li = createTeamListItem(team, `team-${index}`);
        teamsList.appendChild(li);
    });
}

// Create a set list item
function createSetListItem(set, detailsId, isTop) {
    const li = document.createElement('li');
    li.className = 'set-item';
    
    const setInfo = document.createElement('div');
    setInfo.style.display = 'flex';
    setInfo.style.justifyContent = 'space-between';
    setInfo.style.alignItems = 'center';
    setInfo.style.width = '100%';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'set-name';
    nameSpan.textContent = set.displayName;
    nameSpan.onclick = () => toggleSetDetails(detailsId);
    
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'set-score';
    scoreSpan.textContent = set.displayScore;
    
    setInfo.appendChild(nameSpan);
    setInfo.appendChild(scoreSpan);
    li.appendChild(setInfo);
    
    const details = createSetDetails(set.baseName, detailsId);
    li.appendChild(details);
    
    return li;
}

// Create set details section
function createSetDetails(setBaseName, detailsId) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'set-details';
    detailsDiv.id = detailsId;
    
    if (!STATE.pokemonData) {
        detailsDiv.innerHTML = '<div class="set-details-row">Pokemon data not loaded</div>';
        return detailsDiv;
    }
    
    const setData = STATE.pokemonData.find(s => s.name === setBaseName);
    
    if (!setData) {
        detailsDiv.innerHTML = `<div class="set-details-row">No data found for ${setBaseName}</div>`;
        return detailsDiv;
    }
    
    detailsDiv.innerHTML = `
        <div class="set-details-row">
            <span class="set-details-label">Ability:</span> ${setData.abilities}
        </div>
        <div class="set-details-row">
            <span class="set-details-label">Item:</span> ${setData.item}
        </div>
        <div class="set-details-row">
            <span class="set-details-label">Moves:</span> ${setData.move1} / ${setData.move2} / ${setData.move3} / ${setData.move4}
        </div>
    `;
    
    return detailsDiv;
}

// Create team list item
function createTeamListItem(team, detailsId) {
    const li = document.createElement('li');
    li.className = 'set-item';
    
    const teamInfo = document.createElement('div');
    teamInfo.style.display = 'flex';
    teamInfo.style.justifyContent = 'space-between';
    teamInfo.style.alignItems = 'center';
    teamInfo.style.width = '100%';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'set-name';
    nameSpan.textContent = team.members.join(' + ');
    nameSpan.onclick = () => toggleTeamDetails(detailsId);
    
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'set-score';
    scoreSpan.textContent = team.score.toFixed(3);
    
    teamInfo.appendChild(nameSpan);
    teamInfo.appendChild(scoreSpan);
    li.appendChild(teamInfo);
    
    const details = createTeamDetails(team, detailsId);
    li.appendChild(details);
    
    return li;
}

// Create team details section
function createTeamDetails(team, detailsId) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'team-details';
    detailsDiv.id = detailsId;
    
    if (!STATE.pokemonData) {
        detailsDiv.innerHTML = '<div>Pokemon data not loaded</div>';
        return detailsDiv;
    }
    
    // Create grid for the 3 pokemon
    const gridDiv = document.createElement('div');
    gridDiv.className = 'team-pokemon-grid';
    
    team.members.forEach(memberName => {
        const parsedName = parseSetName(memberName);
        const baseName = parsedName.baseName;
        const setData = STATE.pokemonData.find(s => s.name === baseName);
        
        const card = document.createElement('div');
        card.className = 'team-pokemon-card';
        
        if (setData) {
            card.innerHTML = `
                <div class="team-pokemon-name">${memberName}</div>
                <div><strong>Ability:</strong> ${setData.abilities}</div>
                <div><strong>Item:</strong> ${setData.item}</div>
                <div><strong>Moves:</strong> ${setData.move1} / ${setData.move2} / ${setData.move3} / ${setData.move4}</div>
            `;
        } else {
            card.innerHTML = `<div class="team-pokemon-name">${memberName}</div><div>No data found</div>`;
        }
        
        gridDiv.appendChild(card);
    });
    
    detailsDiv.appendChild(gridDiv);
    
    // Add variants section if there are other variants
    if (team.allVariants && team.allVariants.length > 1) {
        const variantsDiv = document.createElement('div');
        variantsDiv.className = 'team-variants';
        
        const title = document.createElement('div');
        title.className = 'team-variants-title';
        title.textContent = 'Other Ability Variants:';
        variantsDiv.appendChild(title);
        
        // Skip the first variant (that's the one we're showing)
        team.allVariants.slice(1).forEach(variant => {
            const variantItem = document.createElement('div');
            variantItem.className = 'team-variant-item';
            variantItem.textContent = `${variant.members.join(' + ')} - ${variant.score.toFixed(3)}`;
            variantsDiv.appendChild(variantItem);
        });
        
        detailsDiv.appendChild(variantsDiv);
    }
    
    return detailsDiv;
}

// Toggle set details visibility
function toggleSetDetails(detailsId) {
    const detailsDiv = document.getElementById(detailsId);
    if (detailsDiv) {
        detailsDiv.classList.toggle('expanded');
    }
}

// Toggle team details visibility
function toggleTeamDetails(detailsId) {
    const detailsDiv = document.getElementById(detailsId);
    if (detailsDiv) {
        detailsDiv.classList.toggle('expanded');
    }
}