// Search Tab Functions

// Load search data set
async function loadSearchDataSet(dataSetKey, buttonElement) {
    STATE.currentSearchDataSet = dataSetKey;
    
    updateButtonStates(buttonElement, '#search-tab');
    
    showStatus('search-status', `Loading ${buttonElement.textContent} data...`);
    document.getElementById('matchup-results-container').classList.add('hidden');

    try {
        const filePath = CONFIG.dataSetFiles[dataSetKey];
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        STATE.searchData = await response.json();
        
        hideStatus('search-status');
        
        // Clear search input and current selection
        document.getElementById('search-pokemon-input').value = '';
        document.getElementById('search-pokemon-dropdown').style.display = 'none';
        STATE.currentSelectedSet = null;
        STATE.currentMatchups = null;
        
        // Setup search for new data
        setupPokemonSearch();
        setupPokemonFilterDropdown();
    } catch (error) {
        console.error('Error loading search data:', error);
        showStatus('search-status', `Error loading data: ${error.message}`, 'error');
    }
}

// Setup pokemon search functionality
function setupPokemonSearch() {
    setupDropdown(
        'search-pokemon-input',
        'search-pokemon-dropdown',
        searchPokemonSets,
        selectPokemonSet
    );
}

// Search for pokemon sets
async function searchPokemonSets(query) {
    if (!STATE.searchData) return [];
    
    return STATE.searchData.filter(set => 
        set.name.toLowerCase().startsWith(query)
    );
}

// Select a pokemon set
function selectPokemonSet(set) {
    document.getElementById('search-pokemon-input').value = set.name;
    
    // Store current selection
    STATE.currentSelectedSet = set;
    STATE.currentMatchups = set.scores;
    
    // Reset filters
    document.getElementById('type-filter').value = '';
    document.getElementById('pokemon-filter-input').value = '';
    
    displayMatchups();
}

// Display matchups
function displayMatchups() {
    if (!STATE.currentSelectedSet || !STATE.currentMatchups) return;
    
    const set = STATE.currentSelectedSet;
    
    // Show the results container
    document.getElementById('matchup-results-container').classList.remove('hidden');
    
    // Display set info
    displaySetInfo(set);
    
    // Get current filters
    const typeFilter = document.getElementById('type-filter').value;
    const pokemonFilter = document.getElementById('pokemon-filter-input').value.trim();
    
    // Filter and display matchups
    const filteredMatchups = filterMatchups(STATE.currentMatchups, typeFilter, pokemonFilter);
    const frequencyRound = getFrequencyRoundFromDataKey(STATE.currentSearchDataSet);
    
    // Calculate and display averages
    displayAverages(STATE.currentMatchups, filteredMatchups, typeFilter || pokemonFilter, frequencyRound);
    
    // Display grouped matchups
    displayGroupedMatchups(filteredMatchups);
    
    // Scroll to results
    document.getElementById('matchup-results-container').scrollIntoView({ behavior: 'smooth' });
}

// Display set information
function displaySetInfo(set) {
    const parsedName = parseSetName(set.name);
    const setData = STATE.pokemonData ? STATE.pokemonData.find(s => s.name === parsedName.baseName) : null;
    
    document.getElementById('selected-pokemon-name').textContent = set.name;
    
    if (setData) {
        document.getElementById('selected-pokemon-ability').innerHTML = 
            `<span class="set-info-label">Ability:</span> ${setData.abilities}`;
        document.getElementById('selected-pokemon-item').innerHTML = 
            `<span class="set-info-label">Item:</span> ${setData.item}`;
        document.getElementById('selected-pokemon-moves').innerHTML = 
            `<span class="set-info-label">Moves:</span> ${setData.move1} / ${setData.move2} / ${setData.move3} / ${setData.move4}`;
    } else {
        document.getElementById('selected-pokemon-ability').textContent = '';
        document.getElementById('selected-pokemon-item').textContent = '';
        document.getElementById('selected-pokemon-moves').textContent = '';
    }
}

// Filter matchups
function filterMatchups(matchups, typeFilter, pokemonFilter) {
    let filteredMatchups = [];
    
    for (const [opponentName, score] of Object.entries(matchups)) {
        if (pokemonFilter) {
            // Filter by specific pokemon
            const opponentParsed = parseSetName(opponentName);
            const pokemonName = opponentParsed.baseName.split('-')[0];
            
            if (pokemonName.toLowerCase() === pokemonFilter.toLowerCase()) {
                filteredMatchups.push({ name: opponentName, score: score });
            }
        } else if (typeFilter) {
            // Filter by type
            const opponentParsed = parseSetName(opponentName);
            const opponentData = STATE.pokemonData ? 
                STATE.pokemonData.find(s => s.name === opponentParsed.baseName) : null;
            
            if (opponentData && 
                (opponentData.type1 === typeFilter || opponentData.type2 === typeFilter)) {
                filteredMatchups.push({ name: opponentName, score: score });
            }
        } else {
            // No filter, show all
            filteredMatchups.push({ name: opponentName, score: score });
        }
    }
    
    return filteredMatchups;
}

// Display averages
function displayAverages(allMatchups, filteredMatchups, filterLabel, frequencyRound) {
    const overallAverage = calculateWeightedAverage(allMatchups, frequencyRound);
    let averageText = `<span class="set-info-label">Average:</span> ${overallAverage.toFixed(3)}`;
    
    if (filterLabel && filteredMatchups.length > 0) {
        const filteredScores = {};
        filteredMatchups.forEach(m => {
            filteredScores[m.name] = m.score;
        });
        const filteredAverage = calculateWeightedAverage(filteredScores, frequencyRound);
        averageText += ` | <span class="set-info-label">Average (${filterLabel}):</span> ${filteredAverage.toFixed(3)}`;
    }
    
    document.getElementById('selected-pokemon-average').innerHTML = averageText;
}

// Display grouped matchups
function displayGroupedMatchups(matchups) {
    // Combine abilities with same scores
    const combinedMatchups = combineMatchupAbilities(matchups);
    
    // Group matchups by score ranges
    const matchupGroups = {
        veryFavorable: { label: 'Very Favorable (≥ 0.8)', matchups: [], class: 'very-favorable' },
        favorable: { label: 'Favorable (0.6 - 0.799)', matchups: [], class: 'favorable' },
        neutral: { label: 'Neutral (0.4 - 0.599)', matchups: [], class: 'neutral' },
        unfavorable: { label: 'Unfavorable (0.2 - 0.399)', matchups: [], class: 'unfavorable' },
        veryUnfavorable: { label: 'Very Unfavorable (< 0.2)', matchups: [], class: 'very-unfavorable' }
    };
    
    // Categorize combined matchups
    combinedMatchups.forEach(matchup => {
        if (matchup.score >= 0.8) {
            matchupGroups.veryFavorable.matchups.push(matchup);
        } else if (matchup.score >= 0.6) {
            matchupGroups.favorable.matchups.push(matchup);
        } else if (matchup.score >= 0.4) {
            matchupGroups.neutral.matchups.push(matchup);
        } else if (matchup.score >= 0.2) {
            matchupGroups.unfavorable.matchups.push(matchup);
        } else {
            matchupGroups.veryUnfavorable.matchups.push(matchup);
        }
    });
    
    // Sort matchups within each group by score (descending)
    for (const group of Object.values(matchupGroups)) {
        group.matchups.sort((a, b) => b.score - a.score);
    }
    
    // Display the groups
    const container = document.getElementById('matchup-groups-container');
    container.innerHTML = '';
    
    for (const group of Object.values(matchupGroups)) {
        if (group.matchups.length > 0) {
            const groupDiv = createMatchupGroup(group);
            container.appendChild(groupDiv);
        }
    }
}

// Create a matchup group element
function createMatchupGroup(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'matchup-group';
    
    const header = document.createElement('div');
    header.className = `matchup-group-header ${group.class}`;
    header.textContent = `${group.label} (${group.matchups.length} matchups)`;
    
    const listDiv = document.createElement('div');
    listDiv.className = 'matchup-list';
    
    group.matchups.forEach(matchup => {
        const item = document.createElement('div');
        item.className = 'matchup-list-item';
        item.innerHTML = `
            <span class="matchup-opponent">${matchup.displayName}</span>
            <span class="matchup-score">${matchup.score.toFixed(3)}</span>
        `;
        listDiv.appendChild(item);
    });
    
    groupDiv.appendChild(header);
    groupDiv.appendChild(listDiv);
    return groupDiv;
}

// Filter functions
function applyTypeFilter() {
    const typeFilter = document.getElementById('type-filter').value;
    
    // Clear pokemon filter when type filter is selected
    if (typeFilter) {
        document.getElementById('pokemon-filter-input').value = '';
    }
    
    displayMatchups();
}

// Setup pokemon filter dropdown
function setupPokemonFilterDropdown() {
    setupDropdown(
        'pokemon-filter-input',
        'pokemon-filter-dropdown',
        searchPokemonNames,
        selectPokemonFilter
    );
    
    // Add input event to clear type filter
    const filterInput = document.getElementById('pokemon-filter-input');
    const originalInputHandler = filterInput.oninput;
    filterInput.addEventListener('input', function() {
        if (this.value.length > 0) {
            document.getElementById('type-filter').value = '';
        }
        // Display matchups immediately when filter is cleared
        if (this.value.length === 0) {
            displayMatchups();
        }
    });
}

// Search for pokemon names
async function searchPokemonNames(query) {
    if (!STATE.pokemonData) return [];
    
    // Get unique pokemon names from pokemonData
    const pokemonNames = new Set();
    STATE.pokemonData.forEach(set => {
        const baseName = set.name.split('-')[0];
        pokemonNames.add(baseName);
    });

    return Array.from(pokemonNames)
        .filter(name => name.toLowerCase().startsWith(query))
        .sort();
}

// Select a pokemon to filter by
function selectPokemonFilter(pokemonName) {
    document.getElementById('pokemon-filter-input').value = pokemonName;
    
    // Clear type filter
    document.getElementById('type-filter').value = '';
    
    displayMatchups();
}