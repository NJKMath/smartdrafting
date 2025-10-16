// Draft Tab Functions

// Select draft round
function selectDraftRound(round, buttonElement) {
    STATE.draftRound = round;
    
    updateButtonStates(buttonElement, '#draft-tab .search-controls:first-child');
    
    // Reset teams
    STATE.draftTeam = [null, null, null, null, null, null];
    STATE.swapYourTeam = [null, null, null];
    STATE.swapOpponentTeam = [
        {pokemon: null, sets: ['any'], ignore: false},
        {pokemon: null, sets: ['any'], ignore: false},
        {pokemon: null, sets: ['any'], ignore: false}
    ];
    
    // Rebuild slots
    if (STATE.draftType === 'table') {
        buildDraftSlots();
    } else {
        buildSwapSlots();
    }
}

// Select draft type
function selectDraftType(type, buttonElement) {
    STATE.draftType = type;
    
    updateButtonStates(buttonElement, '#draft-tab .search-controls:nth-child(2)');
    
    // Show/hide appropriate container
    if (type === 'table') {
        document.getElementById('draft-table-container').classList.remove('hidden');
        document.getElementById('draft-swap-container').classList.add('hidden');
        buildDraftSlots();
    } else {
        document.getElementById('draft-table-container').classList.add('hidden');
        document.getElementById('draft-swap-container').classList.remove('hidden');
        buildSwapSlots();
    }
}

// Build draft slots for table mode
function buildDraftSlots() {
    const container = document.getElementById('draft-team-slots');
    container.innerHTML = '';
    container.className = 'draft-slots-grid';
    
    for (let i = 0; i < 6; i++) {
        const slot = createDraftSlot(i);
        container.appendChild(slot);
    }
    
    // Setup search AFTER elements are in DOM
    for (let i = 0; i < 6; i++) {
        setupDraftSlotSearch(i);
    }
    
    // Hide results
    document.getElementById('draft-results').classList.add('hidden');
}

// Create a single draft slot
function createDraftSlot(slotIndex) {
    const slot = document.createElement('div');
    slot.className = 'draft-slot';
    
    // Label
    const label = document.createElement('div');
    label.className = 'draft-slot-label';
    label.textContent = `Slot ${slotIndex + 1}`;
    
    // Search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'draft-slot-search';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-input';
    input.placeholder = 'Search pokemon...';
    input.id = `draft-slot-${slotIndex}-input`;
    input.autocomplete = 'off';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.id = `draft-slot-${slotIndex}-dropdown`;
    dropdown.style.display = 'none';
    
    searchContainer.appendChild(input);
    searchContainer.appendChild(dropdown);
    
    // IV controls
    const ivContainer = document.createElement('div');
    ivContainer.className = 'draft-slot-iv';
    ivContainer.id = `draft-slot-${slotIndex}-iv`;
    
    buildIVControl(ivContainer, slotIndex);
    
    slot.appendChild(label);
    slot.appendChild(searchContainer);
    slot.appendChild(ivContainer);
    
    return slot;
}

// Build IV control for a slot
function buildIVControl(container, slotIndex) {
    container.innerHTML = '';
    
    const label = document.createElement('span');
    label.className = 'draft-slot-iv-label';
    label.textContent = 'IV:';
    container.appendChild(label);
    
    const ivControl = createIVControl(STATE.draftRound, slotIndex, 'draft', () => {
        // Clear the slot when IV changes
        const input = document.getElementById(`draft-slot-${slotIndex}-input`);
        if (input) {
            input.value = '';
            STATE.draftTeam[slotIndex] = null;
        }
    });
    
    container.appendChild(ivControl);
}

// Create IV control element
function createIVControl(round, slotIndex, type, onChangeCallback) {
    if (round === 'round1') {
        return createIVDisplay('3');
    } else if (round === 'round2') {
        if (type === 'swap') {
            return createIVSelect(['3', '6'], '6', onChangeCallback);
        }
        return createIVDisplay('6');
    } else if (round === 'round3') {
        if (type === 'swap') {
            return createIVSelect(['3', '9'], '9', onChangeCallback);
        }
        return createIVDisplay('9');
    } else if (round === 'round4') {
        if (slotIndex === 0) {
            const options = type === 'swap' ? ['3', '12', '15'] : ['12', '15'];
            return createIVSelect(options, '12', onChangeCallback);
        } else if (type === 'swap') {
            return createIVSelect(['3', '12'], '12', onChangeCallback);
        }
        return createIVDisplay('12');
    } else if (round === 'round5') {
        if (type === 'swap') {
            return createIVSelect(['3', '15', '21', '31', 'random'], '31', onChangeCallback);
        }
        return createIVSelect(['15', '21', '31', 'random'], '31', onChangeCallback);
    }
    
    return createIVDisplay('3');
}

// Create IV display (non-editable)
function createIVDisplay(value) {
    const display = document.createElement('div');
    display.className = 'draft-slot-iv-display';
    display.textContent = value;
    return display;
}

// Create IV select dropdown
function createIVSelect(options, defaultValue, onChangeCallback) {
    const select = document.createElement('select');
    select.className = 'draft-slot-iv-select';
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === defaultValue) option.selected = true;
        select.appendChild(option);
    });
    
    if (onChangeCallback) {
        select.addEventListener('change', onChangeCallback);
    }
    
    return select;
}

// Setup search for a draft slot
function setupDraftSlotSearch(slotIndex) {
    setupDropdown(
        `draft-slot-${slotIndex}-input`,
        `draft-slot-${slotIndex}-dropdown`,
        async (query) => searchDraftSlotPokemon(query, slotIndex),
        (set) => selectDraftSlot(slotIndex, set)
    );
}

// Search for pokemon in draft slot
async function searchDraftSlotPokemon(query, slotIndex) {
    // Determine which data file to search based on round and current IV selection
    let dataKey;
    if (STATE.draftRound === 'round1') {
        dataKey = 'round1';
    } else if (STATE.draftRound === 'round2') {
        dataKey = 'round2table';
    } else if (STATE.draftRound === 'round3') {
        dataKey = 'round3table';
    } else if (STATE.draftRound === 'round4') {
        if (slotIndex === 0) {
            // Check current IV selection
            const ivSelect = document.querySelector(`#draft-slot-${slotIndex}-iv select`);
            const ivValue = ivSelect ? ivSelect.value : '12';
            dataKey = ivValue === '15' ? 'round4elevations' : 'round4table';
        } else {
            dataKey = 'round4table';
        }
    } else if (STATE.draftRound === 'round5') {
        // Check current IV selection
        const ivSelect = document.querySelector(`#draft-slot-${slotIndex}-iv select`);
        const ivValue = ivSelect ? ivSelect.value : '31';
        if (ivValue === '15') dataKey = 'round5p15iv';
        else if (ivValue === '21') dataKey = 'round5p21iv';
        else if (ivValue === '31') dataKey = 'round5p31iv';
        else dataKey = 'round5popponents';
    }
    
    const data = await loadDataFromFile(dataKey);
    
    if (!data) return [];
    
    return data.filter(set => set.name.toLowerCase().startsWith(query));
}

// Select a pokemon for draft slot
function selectDraftSlot(slotIndex, set) {
    const input = document.getElementById(`draft-slot-${slotIndex}-input`);
    input.value = set.name;
    STATE.draftTeam[slotIndex] = set;
}

// Calculate draft results
async function calculateDraft() {
    const results = [];
    
    for (let i = 0; i < 6; i++) {
        const set = STATE.draftTeam[i];
        
        // Handle empty slots
        if (!set) {
            results.push({
                name: 'Empty',
                average: 0,
                iv: '-',
                empty: true,
                scores: null
            });
            continue;
        }
        
        // Get IV value for this slot
        let ivValue = getSlotIVValue(i, 'draft');
        
        // Load appropriate data
        const dataKey = getDraftDataKey(STATE.draftRound, i, ivValue);
        const data = await loadDataFromFile(dataKey);
        
        if (data) {
            const matchingSet = data.find(s => s.name === set.name);
            if (matchingSet) {
                // Calculate weighted average
                const weightedAvg = calculateWeightedAverage(matchingSet.scores, STATE.draftRound);
                
                results.push({
                    name: set.name,
                    average: weightedAvg,
                    iv: ivValue,
                    empty: false,
                    scores: matchingSet.scores
                });
            } else {
                // Set not found in data
                results.push({
                    name: set.name,
                    average: 0,
                    iv: ivValue,
                    empty: true,
                    scores: null
                });
            }
        } else {
            results.push({
                name: set.name,
                average: 0,
                iv: ivValue,
                empty: true,
                scores: null
            });
        }
    }
    
    // Display results
    displayDraftResults(results);
}

// Get IV value for a slot
function getSlotIVValue(slotIndex, type) {
    const prefix = type === 'draft' ? 'draft-slot' : 'swap-your';
    
    if (STATE.draftRound === 'round1') return '3';
    else if (STATE.draftRound === 'round2') return type === 'swap' ? getSelectValue(prefix, slotIndex) : '6';
    else if (STATE.draftRound === 'round3') return type === 'swap' ? getSelectValue(prefix, slotIndex) : '9';
    else if (STATE.draftRound === 'round4') {
        if (slotIndex === 0 || type === 'swap') {
            return getSelectValue(prefix, slotIndex);
        }
        return '12';
    } else if (STATE.draftRound === 'round5') {
        return getSelectValue(prefix, slotIndex);
    }
    
    return '3';
}

// Get select value helper
function getSelectValue(prefix, slotIndex) {
    const select = document.querySelector(`#${prefix}-${slotIndex}-iv select`);
    return select ? select.value : getDefaultIV();
}

// Display draft results
function displayDraftResults(results) {
    const container = document.getElementById('draft-results-content');
    container.innerHTML = '';
    
    // Display individual pokemon results
    const individualsGrid = createDraftResultsGrid(results);
    container.appendChild(individualsGrid);
    
    // Calculate and display team combinations
    const validResults = results.filter(r => !r.empty);
    if (validResults.length >= 3) {
        const teamsSection = createDraftTeamsSection(validResults);
        container.appendChild(teamsSection);
    }
    
    document.getElementById('draft-results').classList.remove('hidden');
    document.getElementById('draft-results').scrollIntoView({ behavior: 'smooth' });
}

// Create draft results grid
function createDraftResultsGrid(results) {
    const individualsGrid = document.createElement('div');
    individualsGrid.className = 'draft-results-grid';
    
    results.forEach((result, index) => {
        const card = createDraftResultCard(result, index);
        individualsGrid.appendChild(card);
    });
    
    return individualsGrid;
}

// Create draft result card
function createDraftResultCard(result, index) {
    const card = document.createElement('div');
    card.className = 'draft-result-card';
    
    if (result.empty) {
        card.style.opacity = '0.5';
        card.innerHTML = `
            <div class="draft-result-name">Slot ${index + 1}: ${result.name}</div>
            <div style="font-size: 14px; color: #999; margin-top: 8px;"><strong>Average:</strong> 0.000</div>
        `;
    } else {
        const parsedName = parseSetName(result.name);
        const setData = STATE.pokemonData ? 
            STATE.pokemonData.find(s => s.name === parsedName.baseName) : null;
        
        let setInfoHTML = '';
        if (setData) {
            setInfoHTML = `
                <div style="font-size: 12px; color: #666; margin: 8px 0;">
                    <div><strong>Ability:</strong> ${setData.abilities}</div>
                    <div><strong>Item:</strong> ${setData.item}</div>
                    <div><strong>Moves:</strong> ${setData.move1} / ${setData.move2} / ${setData.move3} / ${setData.move4}</div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="draft-result-name">Slot ${index + 1}: ${result.name}</div>
            ${setInfoHTML}
            <div style="font-size: 14px; color: #28a745; margin-top: 8px; font-weight: bold;">
                <strong>Average:</strong> ${result.average.toFixed(3)}
            </div>
        `;
    }
    
    return card;
}

// Create draft teams section
function createDraftTeamsSection(validResults) {
    const section = document.createElement('div');
    
    const title = document.createElement('h4');
    title.textContent = 'Top Team Combinations';
    title.style.marginTop = '30px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    const teams = calculateDraftTeams(validResults);
    
    const teamsList = document.createElement('div');
    teamsList.style.background = '#f8f9fa';
    teamsList.style.padding = '15px';
    teamsList.style.borderRadius = '8px';
    
    teams.forEach((team, index) => {
        const teamItem = createDraftTeamItem(team, index, teams.length);
        teamsList.appendChild(teamItem);
    });
    
    section.appendChild(teamsList);
    return section;
}

// Create draft team item
function createDraftTeamItem(team, index, totalTeams) {
    const teamItem = document.createElement('div');
    teamItem.style.padding = '10px 0';
    teamItem.style.borderBottom = index < totalTeams - 1 ? '1px solid #dee2e6' : 'none';
    teamItem.style.display = 'flex';
    teamItem.style.justifyContent = 'space-between';
    teamItem.style.alignItems = 'center';
    
    teamItem.innerHTML = `
        <span style="font-weight: 500;">${team.displayName}</span>
        <span style="font-weight: bold; color: #6f42c1; font-size: 16px;">${team.score.toFixed(3)}</span>
    `;
    
    return teamItem;
}

// Calculate draft teams
function calculateDraftTeams(results) {
    const teams = [];
    
    // Generate all combinations of 3 from valid results
    for (let i = 0; i < results.length - 2; i++) {
        for (let j = i + 1; j < results.length - 1; j++) {
            for (let k = j + 1; k < results.length; k++) {
                const team = [results[i], results[j], results[k]];
                
                // Calculate team score using max-based scoring
                const teamScore = calculateDraftTeamScore(team);
                
                // Find the highest average pokemon (lead)
                const sortedByAvg = [...team].sort((a, b) => b.average - a.average);
                const leadName = sortedByAvg[0].name;
                
                // Reorder team so lead is first
                const orderedTeam = [
                    sortedByAvg[0],
                    ...team.filter(m => m.name !== leadName)
                ];
                
                // Build display name with lead marked and first
                const displayName = orderedTeam.map((member, idx) => 
                    idx === 0 ? `${member.name} (Lead)` : member.name
                ).join(' + ');
                
                teams.push({
                    members: orderedTeam,
                    score: teamScore,
                    displayName: displayName
                });
            }
        }
    }
    
    // Sort by score descending
    teams.sort((a, b) => b.score - a.score);
    
    return teams;
}

// Calculate draft team score
function calculateDraftTeamScore(team) {
    // Get all opponent names from all team members
    const allOpponents = new Set();
    team.forEach(member => {
        if (member.scores) {
            Object.keys(member.scores).forEach(opp => allOpponents.add(opp));
        }
    });
    
    if (allOpponents.size === 0) {
        return 0;
    }
    
    // Get frequency data for current round
    const freqMap = STATE.frequencyData[STATE.draftRound] || {};
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    // For each opponent, find the max score among team members
    allOpponents.forEach(opponent => {
        let maxScore = 0;
        
        team.forEach(member => {
            if (member.scores && member.scores[opponent] !== undefined) {
                const score = member.scores[opponent];
                maxScore = Math.max(maxScore, score);
            }
        });
        
        // Get frequency weight for this opponent
        const weight = freqMap[opponent] || CONFIG.defaults.defaultFrequencyWeight;
        
        totalWeightedScore += maxScore * weight;
        totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

// Quick team loading for table mode
async function loadQuickTeamTable() {
    const input = document.getElementById('quick-team-table-input');
    const teamString = input.value.trim();
    
    if (!teamString) return;
    
    const parsedSets = parseTeamString(teamString);
    
    // Get the appropriate data file for searching
    let dataKey = getDefaultTableDataKey();
    const data = await loadDataFromFile(dataKey);
    
    if (!data) {
        alert('Error loading data');
        return;
    }
    
    // Try to load each set into the slots
    for (let i = 0; i < Math.min(parsedSets.length, 6); i++) {
        const setName = parsedSets[i];
        
        // Try to find this set in the data
        let matchingSet = data.find(s => s.name === setName);
        
        if (!matchingSet) {
            // Try to find with ability variants
            const variants = data.filter(s => s.name.startsWith(setName + '-'));
            if (variants.length > 0) {
                matchingSet = variants[0];
            }
        }
        
        if (matchingSet) {
            const input = document.getElementById(`draft-slot-${i}-input`);
            if (input) {
                input.value = matchingSet.name;
                STATE.draftTeam[i] = matchingSet;
            }
        }
    }
}

// ========== SWAP MODE FUNCTIONS ==========

// Build swap slots
function buildSwapSlots() {
    // Reset teams
    STATE.swapYourTeam = [null, null, null];
    STATE.swapOpponentTeam = [
        {pokemon: null, sets: ['any'], ignore: false},
        {pokemon: null, sets: ['any'], ignore: false},
        {pokemon: null, sets: ['any'], ignore: false}
    ];
    
    // Build your team slots
    buildSwapYourTeamSlots();
    
    // Build opponent team slots
    buildSwapOpponentTeamSlots();
    
    // Hide results
    document.getElementById('swap-results').classList.add('hidden');
}

// Build your team slots for swap mode
function buildSwapYourTeamSlots() {
    const container = document.getElementById('swap-your-team-slots');
    container.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const slot = createSwapYourSlot(i);
        container.appendChild(slot);
    }
    
    // Setup search AFTER elements are in DOM
    for (let i = 0; i < 3; i++) {
        setupSwapYourSlotSearch(i);
    }
}

// Create your team slot for swap mode
function createSwapYourSlot(slotIndex) {
    const slot = document.createElement('div');
    slot.className = 'draft-slot';
    
    // Label
    const label = document.createElement('div');
    label.className = 'draft-slot-label';
    label.textContent = `Your Pokemon ${slotIndex + 1}`;
    
    // Search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'draft-slot-search';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-input';
    input.placeholder = 'Search pokemon...';
    input.id = `swap-your-${slotIndex}-input`;
    input.autocomplete = 'off';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.id = `swap-your-${slotIndex}-dropdown`;
    dropdown.style.display = 'none';
    
    searchContainer.appendChild(input);
    searchContainer.appendChild(dropdown);
    
    // IV controls
    const ivContainer = document.createElement('div');
    ivContainer.className = 'draft-slot-iv';
    ivContainer.id = `swap-your-${slotIndex}-iv`;
    
    buildSwapYourIVControl(ivContainer, slotIndex);
    
    slot.appendChild(label);
    slot.appendChild(searchContainer);
    slot.appendChild(ivContainer);
    
    return slot;
}

// Build IV control for swap your team
function buildSwapYourIVControl(container, slotIndex) {
    container.innerHTML = '';
    
    const label = document.createElement('span');
    label.className = 'draft-slot-iv-label';
    label.textContent = 'IV:';
    container.appendChild(label);
    
    const ivControl = createIVControl(STATE.draftRound, slotIndex, 'swap', () => {
        // Clear the slot when IV changes
        const input = document.getElementById(`swap-your-${slotIndex}-input`);
        if (input) {
            input.value = '';
            STATE.swapYourTeam[slotIndex] = null;
        }
    });
    
    container.appendChild(ivControl);
}

// Setup search for swap your team slot
function setupSwapYourSlotSearch(slotIndex) {
    setupDropdown(
        `swap-your-${slotIndex}-input`,
        `swap-your-${slotIndex}-dropdown`,
        async (query) => searchSwapYourPokemon(query, slotIndex),
        (set) => selectSwapYourSlot(slotIndex, set)
    );
}

// Search for pokemon in swap your slot
async function searchSwapYourPokemon(query, slotIndex) {
    const ivSelect = document.querySelector(`#swap-your-${slotIndex}-iv select`);
    const ivValue = ivSelect ? ivSelect.value : getDefaultIV();
    const dataKey = getSwapYourDataKey(slotIndex, ivValue);
    const data = await loadDataFromFile(dataKey);
    
    if (!data) return [];
    
    return data.filter(set => set.name.toLowerCase().startsWith(query));
}

// Select swap your team slot
function selectSwapYourSlot(slotIndex, set) {
    const input = document.getElementById(`swap-your-${slotIndex}-input`);
    input.value = set.name;
    STATE.swapYourTeam[slotIndex] = set;
}

// Build opponent team slots
function buildSwapOpponentTeamSlots() {
    const container = document.getElementById('swap-opponent-team-slots');
    container.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const slot = createSwapOpponentSlot(i);
        container.appendChild(slot);
    }
    
    // Setup search AFTER elements are in DOM
    for (let i = 0; i < 3; i++) {
        setupSwapOpponentSlotSearch(i);
    }
    
    // Close menus when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.set-checkbox-dropdown')) {
            document.querySelectorAll('.set-checkbox-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

// Create opponent slot for swap mode
function createSwapOpponentSlot(slotIndex) {
    const slot = document.createElement('div');
    slot.className = 'draft-slot';
    
    // Label
    const label = document.createElement('div');
    label.className = 'draft-slot-label';
    label.textContent = `Opponent Pokemon ${slotIndex + 1}`;
    
    // Controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'swap-opponent-controls';
    
    // Pokemon search
    const searchContainer = createOpponentSearchContainer(slotIndex);
    
    // Set selector
    const setSelector = createSetSelector(slotIndex);
    
    controlsContainer.appendChild(searchContainer);
    controlsContainer.appendChild(setSelector);
    
    // IV display (always 3)
    const ivContainer = document.createElement('div');
    ivContainer.className = 'draft-slot-iv';
    const ivLabel = document.createElement('span');
    ivLabel.className = 'draft-slot-iv-label';
    ivLabel.textContent = 'IV:';
    const ivDisplay = document.createElement('div');
    ivDisplay.className = 'draft-slot-iv-display';
    ivDisplay.textContent = '3';
    ivContainer.appendChild(ivLabel);
    ivContainer.appendChild(ivDisplay);
    
    slot.appendChild(label);
    slot.appendChild(controlsContainer);
    slot.appendChild(ivContainer);
    
    // Add ignore checkbox for slots 1 and 2
    if (slotIndex > 0) {
        const ignoreContainer = createIgnoreCheckbox(slotIndex);
        slot.appendChild(ignoreContainer);
    }
    
    return slot;
}

// Create opponent search container
function createOpponentSearchContainer(slotIndex) {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'swap-opponent-search';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-input';
    input.placeholder = 'Search pokemon...';
    input.id = `swap-opp-${slotIndex}-input`;
    input.autocomplete = 'off';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.id = `swap-opp-${slotIndex}-dropdown`;
    dropdown.style.display = 'none';
    
    searchContainer.appendChild(input);
    searchContainer.appendChild(dropdown);
    
    return searchContainer;
}

// Create set selector dropdown
function createSetSelector(slotIndex) {
    const setSelector = document.createElement('div');
    setSelector.className = 'swap-set-selector';
    
    const checkboxDropdown = document.createElement('div');
    checkboxDropdown.className = 'set-checkbox-dropdown';
    
    const checkboxButton = document.createElement('button');
    checkboxButton.className = 'set-checkbox-button';
    checkboxButton.id = `swap-opp-${slotIndex}-set-button`;
    checkboxButton.textContent = 'Any';
    checkboxButton.onclick = (e) => {
        e.preventDefault();
        toggleSetCheckboxMenu(slotIndex);
    };
    
    const checkboxMenu = createSetCheckboxMenu(slotIndex);
    
    checkboxDropdown.appendChild(checkboxButton);
    checkboxDropdown.appendChild(checkboxMenu);
    setSelector.appendChild(checkboxDropdown);
    
    return setSelector;
}

// Create set checkbox menu
function createSetCheckboxMenu(slotIndex) {
    const checkboxMenu = document.createElement('div');
    checkboxMenu.className = 'set-checkbox-menu';
    checkboxMenu.id = `swap-opp-${slotIndex}-set-menu`;
    
    // Add "Any" option
    const anyItem = createSetCheckboxItem(slotIndex, 'any', 'Any', true);
    checkboxMenu.appendChild(anyItem);
    
    // Add set number options
    for (let setNum = 1; setNum <= 10; setNum++) {
        const item = createSetCheckboxItem(slotIndex, setNum.toString(), `Set ${setNum}`, false);
        checkboxMenu.appendChild(item);
    }
    
    return checkboxMenu;
}

// Create set checkbox item
function createSetCheckboxItem(slotIndex, value, labelText, checked) {
    const item = document.createElement('div');
    item.className = 'set-checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.checked = checked;
    checkbox.id = `swap-opp-${slotIndex}-set-${value}`;
    checkbox.onchange = () => updateSetSelection(slotIndex);
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.cursor = 'pointer';
    label.onclick = () => {
        checkbox.checked = !checkbox.checked;
        updateSetSelection(slotIndex);
    };
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    return item;
}

// Create ignore checkbox
function createIgnoreCheckbox(slotIndex) {
    const ignoreContainer = document.createElement('div');
    ignoreContainer.style.marginTop = '8px';
    ignoreContainer.style.display = 'flex';
    ignoreContainer.style.alignItems = 'center';
    ignoreContainer.style.gap = '5px';
    
    const ignoreCheckbox = document.createElement('input');
    ignoreCheckbox.type = 'checkbox';
    ignoreCheckbox.id = `swap-opp-${slotIndex}-ignore`;
    ignoreCheckbox.onchange = () => {
        STATE.swapOpponentTeam[slotIndex].ignore = ignoreCheckbox.checked;
    };
    
    const ignoreLabel = document.createElement('label');
    ignoreLabel.textContent = 'Ignore this slot';
    ignoreLabel.style.fontSize = '12px';
    ignoreLabel.style.cursor = 'pointer';
    ignoreLabel.onclick = () => {
        ignoreCheckbox.checked = !ignoreCheckbox.checked;
        STATE.swapOpponentTeam[slotIndex].ignore = ignoreCheckbox.checked;
    };
    
    ignoreContainer.appendChild(ignoreCheckbox);
    ignoreContainer.appendChild(ignoreLabel);
    
    return ignoreContainer;
}

// Toggle set checkbox menu
function toggleSetCheckboxMenu(slotIndex) {
    const menu = document.getElementById(`swap-opp-${slotIndex}-set-menu`);
    const allMenus = document.querySelectorAll('.set-checkbox-menu');
    allMenus.forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });
    menu.classList.toggle('show');
}

// Update set selection
function updateSetSelection(slotIndex) {
    const anyCheckbox = document.getElementById(`swap-opp-${slotIndex}-set-any`);
    const button = document.getElementById(`swap-opp-${slotIndex}-set-button`);
    
    // Get selected sets (excluding "any")
    const selectedSets = [];
    for (let i = 1; i <= 10; i++) {
        const checkbox = document.getElementById(`swap-opp-${slotIndex}-set-${i}`);
        if (checkbox && checkbox.checked) {
            selectedSets.push(i.toString());
        }
    }
    
    if (anyCheckbox.checked && selectedSets.length > 0) {
        // If "Any" was just checked, uncheck all specific sets
        anyCheckbox.checked = false;
    }
    
    if (!anyCheckbox.checked && selectedSets.length === 0) {
        // If nothing selected, default to Any
        anyCheckbox.checked = true;
        STATE.swapOpponentTeam[slotIndex].sets = ['any'];
        button.textContent = 'Any';
    } else if (anyCheckbox.checked) {
        // Uncheck all specific sets
        for (let i = 1; i <= 10; i++) {
            const checkbox = document.getElementById(`swap-opp-${slotIndex}-set-${i}`);
            if (checkbox) checkbox.checked = false;
        }
        STATE.swapOpponentTeam[slotIndex].sets = ['any'];
        button.textContent = 'Any';
    } else {
        // Use specific selected sets
        STATE.swapOpponentTeam[slotIndex].sets = selectedSets;
        button.textContent = selectedSets.length === 1 ? 
            `Set ${selectedSets[0]}` : `${selectedSets.length} sets`;
    }
}

// Setup swap opponent slot search
function setupSwapOpponentSlotSearch(slotIndex) {
    setupDropdown(
        `swap-opp-${slotIndex}-input`,
        `swap-opp-${slotIndex}-dropdown`,
        searchOpponentPokemonNames,
        (pokemonName) => selectSwapOpponentSlot(slotIndex, pokemonName)
    );
}

// Search opponent pokemon names
async function searchOpponentPokemonNames(query) {
    if (!STATE.pokemonData) return [];
    
    // Get unique pokemon names
    const pokemonNames = new Set();
    STATE.pokemonData.forEach(set => {
        const baseName = set.name.split('-')[0];
        pokemonNames.add(baseName);
    });
    
    return Array.from(pokemonNames)
        .filter(name => name.toLowerCase().startsWith(query))
        .sort();
}

// Select swap opponent slot
function selectSwapOpponentSlot(slotIndex, pokemonName) {
    const input = document.getElementById(`swap-opp-${slotIndex}-input`);
    input.value = pokemonName;
    STATE.swapOpponentTeam[slotIndex].pokemon = pokemonName;
}

// Calculate swaps
async function calculateSwaps() {
    // Get your team data with IVs
    const yourTeamData = await getYourTeamData();
    
    // Check if we have a valid team
    const validYourTeam = yourTeamData.filter(d => d !== null);
    if (validYourTeam.length < 3) {
        displaySwapResults([], [{
            description: 'Please fill in all 3 slots of your team',
            score: 0,
            valid: false
        }]);
        return;
    }
    
    // Get opponent data
    const opponentsDataKey = getOpponentsDataKey();
    const opponentData = await loadDataFromFile(opponentsDataKey);
    
    if (!opponentData) {
        displaySwapResults([], [{
            description: 'Error loading opponent data',
            score: 0,
            valid: false
        }]);
        return;
    }
    
    // Build possible opponent sets
    const opponentPossibleSets = buildOpponentPossibleSets(opponentData);
    
    // Calculate all possible swaps
    const swapOptions = calculateAllSwapOptions(validYourTeam, opponentPossibleSets, opponentData);
    
    // Sort by score descending
    swapOptions.sort((a, b) => b.score - a.score);
    
    // Generate summary
    const noSwapScore = swapOptions.find(opt => opt.description.includes('No Swap'))?.score || 0;
    const summary = generateSwapSummary(swapOptions, noSwapScore, opponentData);
    
    displaySwapResults(summary, swapOptions);
}

// Get your team data with IVs
async function getYourTeamData() {
    const yourTeamData = [];
    
    for (let i = 0; i < 3; i++) {
        const set = STATE.swapYourTeam[i];
        if (!set) {
            yourTeamData.push(null);
            continue;
        }
        
        const ivValue = getSlotIVValue(i, 'swap');
        const dataKey = getSwapYourDataKey(i, ivValue);
        const data = await loadDataFromFile(dataKey);
        
        if (data) {
            const matchingSet = data.find(s => s.name === set.name);
            if (matchingSet) {
                // Calculate weighted average
                const weightedAvg = calculateWeightedAverage(matchingSet.scores, STATE.draftRound);
                
                yourTeamData.push({
                    name: set.name,
                    average: weightedAvg,
                    scores: matchingSet.scores,
                    slotIndex: i
                });
            } else {
                yourTeamData.push(null);
            }
        } else {
            yourTeamData.push(null);
        }
    }
    
    return yourTeamData;
}

// Build opponent possible sets
function buildOpponentPossibleSets(opponentData) {
    const opponentPossibleSets = [];
    
    for (let i = 0; i < 3; i++) {
        const oppInfo = STATE.swapOpponentTeam[i];
        
        // Skip if ignored
        if (oppInfo.ignore) {
            opponentPossibleSets.push([]);
            continue;
        }
        
        if (!oppInfo.pokemon) {
            opponentPossibleSets.push([]);
            continue;
        }
        
        const possibleSets = [];
        if (oppInfo.sets.includes('any')) {
            // Find all sets for this pokemon
            const allSets = opponentData.filter(set => {
                const parts = set.name.split('-');
                const pokemonName = parts[0];
                return pokemonName.toLowerCase() === oppInfo.pokemon.toLowerCase();
            });
            possibleSets.push(...allSets);
        } else {
            // Find specific sets
            oppInfo.sets.forEach(setNum => {
                const matchingSets = opponentData.filter(set => {
                    const parts = set.name.split('-');
                    const pokemonName = parts[0];
                    const setNumber = parts.length > 1 ? parts[1] : '';
                    return pokemonName.toLowerCase() === oppInfo.pokemon.toLowerCase() && 
                           setNumber === setNum;
                });
                possibleSets.push(...matchingSets);
            });
        }
        
        // Calculate weighted averages for opponent sets
        possibleSets.forEach(oppSet => {
            oppSet.weightedAverage = calculateWeightedAverage(oppSet.scores, STATE.draftRound);
        });
        
        opponentPossibleSets.push(possibleSets);
    }
    
    return opponentPossibleSets;
}

// Calculate all swap options
function calculateAllSwapOptions(validYourTeam, opponentPossibleSets, opponentData) {
    const swapOptions = [];
    
    // Calculate no swap score
    const noSwapScore = calculateDraftTeamScore(validYourTeam);
    swapOptions.push({
        description: 'No Swap (Keep current team)',
        score: noSwapScore,
        valid: true,
        yourPokemon: null,
        oppPokemon: null,
        oppSetName: null
    });
    
    // Calculate swap options
    for (let yourIdx = 0; yourIdx < 3; yourIdx++) {
        for (let oppIdx = 0; oppIdx < 3; oppIdx++) {
            const oppSets = opponentPossibleSets[oppIdx];
            if (oppSets.length === 0) continue;
            
            // For each possible set the opponent could have
            oppSets.forEach(oppSet => {
                // Create new team with swap
                const newTeam = [...validYourTeam];
                newTeam[yourIdx] = {
                    name: oppSet.name,
                    average: oppSet.weightedAverage,
                    scores: oppSet.scores
                };
                
                const swapScore = calculateDraftTeamScore(newTeam);
                
                swapOptions.push({
                    description: `Swap ${validYourTeam[yourIdx].name} → ${oppSet.name}`,
                    score: swapScore,
                    valid: true,
                    improvement: swapScore - noSwapScore,
                    yourPokemon: validYourTeam[yourIdx].name,
                    oppPokemon: STATE.swapOpponentTeam[oppIdx].pokemon,
                    oppSetName: oppSet.name
                });
            });
        }
    }
    
    return swapOptions;
}

// Generate swap summary
function generateSwapSummary(swapOptions, noSwapScore, opponentData) {
    const summary = [];
    
    // Group beneficial swaps by yourPokemon and oppPokemon
    const swapsByYourAndOpp = {};
    
    swapOptions.forEach(swap => {
        if (!swap.yourPokemon || !swap.oppPokemon || swap.improvement <= 0) return;
        
        const key = `${swap.yourPokemon}|||${swap.oppPokemon}`;
        if (!swapsByYourAndOpp[key]) {
            swapsByYourAndOpp[key] = {
                yourPokemon: swap.yourPokemon,
                oppPokemon: swap.oppPokemon,
                sets: [],
                bestScore: swap.score,
                worstScore: swap.score
            };
        }
        
        swapsByYourAndOpp[key].sets.push({
            name: swap.oppSetName,
            score: swap.score,
            improvement: swap.improvement
        });
        
        swapsByYourAndOpp[key].bestScore = Math.max(swapsByYourAndOpp[key].bestScore, swap.score);
        swapsByYourAndOpp[key].worstScore = Math.min(swapsByYourAndOpp[key].worstScore, swap.score);
    });
    
    // Convert to array and sort by best score
    const summaryItems = Object.values(swapsByYourAndOpp);
    summaryItems.sort((a, b) => b.bestScore - a.bestScore);
    
    summaryItems.forEach(item => {
        // Get unique set names
        const setNames = item.sets.map(s => s.name);
        const uniqueSetNames = [...new Set(setNames)];
        
        // Check if this is all possible sets for the pokemon
        const allPossibleSets = opponentData.filter(set => {
            const parts = set.name.split('-');
            const pokemonName = parts[0];
            return pokemonName.toLowerCase() === item.oppPokemon.toLowerCase();
        });
        
        let displayText;
        if (uniqueSetNames.length === allPossibleSets.length) {
            // All sets - use "Any Set"
            displayText = `${item.oppPokemon} (Any Set)`;
        } else {
            // Compact the set names
            displayText = compactSetNames(uniqueSetNames);
        }
        
        // Get improvement range
        const improvements = item.sets.map(s => s.improvement);
        const minImprovement = Math.min(...improvements);
        const maxImprovement = Math.max(...improvements);
        
        let improvementText;
        if (Math.abs(minImprovement - maxImprovement) < 0.001) {
            improvementText = `(+${minImprovement.toFixed(3)})`;
        } else {
            improvementText = `(+${minImprovement.toFixed(3)} to +${maxImprovement.toFixed(3)})`;
        }
        
        summary.push({
            yourPokemon: item.yourPokemon,
            oppPokemon: item.oppPokemon,
            displayText: displayText,
            improvementText: improvementText
        });
    });
    
    return summary;
}

// Display swap results
function displaySwapResults(summary, details) {
    const container = document.getElementById('swap-results-content');
    container.innerHTML = '';
    
    // Display Summary
    if (summary.length > 0) {
        const summarySection = createSwapSummarySection(summary);
        container.appendChild(summarySection);
        
        // Add spacing
        const spacer = document.createElement('div');
        spacer.style.marginTop = '30px';
        container.appendChild(spacer);
    }
    
    // Display Details
    const detailsSection = createSwapDetailsSection(summary, details);
    container.appendChild(detailsSection);
    
    document.getElementById('swap-results').classList.remove('hidden');
    document.getElementById('swap-results').scrollIntoView({ behavior: 'smooth' });
}

// Create swap summary section
function createSwapSummarySection(summary) {
    const section = document.createElement('div');
    
    const summaryTitle = document.createElement('h4');
    summaryTitle.textContent = 'Summary';
    summaryTitle.style.marginBottom = '15px';
    section.appendChild(summaryTitle);
    
    const summaryList = document.createElement('div');
    summaryList.className = 'swap-results-list';
    
    summary.forEach((item, index) => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'swap-result-item';
        
        summaryItem.innerHTML = `
            <div class="swap-result-description">
                <strong>${index + 1}.</strong> Swap ${item.yourPokemon} for ${item.displayText} ${item.improvementText}
            </div>
        `;
        
        summaryList.appendChild(summaryItem);
    });
    
    section.appendChild(summaryList);
    return section;
}

// Create swap details section
function createSwapDetailsSection(summary, details) {
    const section = document.createElement('div');
    
    const detailsTitle = document.createElement('h4');
    detailsTitle.textContent = summary.length > 0 ? 'Details' : 'Swap Recommendations';
    detailsTitle.style.marginBottom = '15px';
    section.appendChild(detailsTitle);
    
    const detailsList = document.createElement('div');
    detailsList.className = 'swap-results-list';
    
    details.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'swap-result-item';
        
        if (!result.valid) {
            item.innerHTML = `
                <div class="swap-result-description">${result.description}</div>
            `;
        } else {
            let improvementText = '';
            if (result.improvement !== undefined) {
                const sign = result.improvement >= 0 ? '+' : '';
                const color = result.improvement >= 0 ? '#28a745' : '#dc3545';
                improvementText = ` <span style="color: ${color};">(${sign}${result.improvement.toFixed(3)})</span>`;
            }
            
            item.innerHTML = `
                <div class="swap-result-description">
                    <strong>${index + 1}.</strong> ${result.description}${improvementText}
                </div>
                <div class="swap-result-score">${result.score.toFixed(3)}</div>
            `;
        }
        
        detailsList.appendChild(item);
    });
    
    section.appendChild(detailsList);
    return section;
}

// Quick team loading for swap mode
async function loadQuickTeamSwap() {
    const input = document.getElementById('quick-team-swap-input');
    const teamString = input.value.trim();
    
    if (!teamString) return;
    
    const parsedSets = parseTeamString(teamString);
    
    // Load data for searching - use default IV settings
    const dataKeys = [];
    for (let i = 0; i < 3; i++) {
        const ivSelect = document.querySelector(`#swap-your-${i}-iv select`);
        const ivValue = ivSelect ? ivSelect.value : getDefaultIV();
        dataKeys.push(getSwapYourDataKey(i, ivValue));
    }
    
    // Try to load each set into the slots
    for (let i = 0; i < Math.min(parsedSets.length, 3); i++) {
        const setName = parsedSets[i];
        const dataKey = dataKeys[i];
        const data = await loadDataFromFile(dataKey);
        
        if (!data) continue;
        
        // Try to find this set in the data
        let matchingSet = data.find(s => s.name === setName);
        
        if (!matchingSet) {
            // Try to find with ability variants
            const variants = data.filter(s => s.name.startsWith(setName + '-'));
            if (variants.length > 0) {
                matchingSet = variants[0];
            }
        }
        
        if (matchingSet) {
            const input = document.getElementById(`swap-your-${i}-input`);
            if (input) {
                input.value = matchingSet.name;
                STATE.swapYourTeam[i] = matchingSet;
            }
        }
    }
}