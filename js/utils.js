// Utility Functions

// Parse a set name to extract base name and ability
function parseSetName(fullName) {
    const parts = fullName.split('-');
    const lastPart = parts[parts.length - 1];
    
    // Check if last part is a number (set number) or letters (ability)
    const isNumber = /^\d+$/.test(lastPart);
    
    if (isNumber) {
        // No ability specified, format is Pokemon-SetNumber
        return {
            baseName: fullName,
            ability: null
        };
    } else {
        // Ability specified, format is Pokemon-SetNumber-Ability
        return {
            baseName: parts.slice(0, -1).join('-'),
            ability: lastPart
        };
    }
}

// Extract base Pokemon name without ability suffix
// e.g., "Aerodactyl-1-RockHead" -> "Aerodactyl-1"
function extractBaseName(setName) {
    const parts = setName.split('-');
    
    // Typical formats:
    // Pokemon-SetNumber (e.g., "Aerodactyl-1")
    // Pokemon-SetNumber-Ability (e.g., "Aerodactyl-1-RockHead")
    
    if (parts.length >= 3) {
        // Check if second part is a number (set number)
        const secondPart = parts[1];
        if (/^\d+$/.test(secondPart)) {
            // Return Pokemon-SetNumber (first two parts)
            return parts.slice(0, 2).join('-');
        }
    }
    
    // If only 2 parts or format doesn't match expected pattern, return as-is
    return setName;
}

// Calculate weighted average using frequency data
// Properly handles ability variants by splitting frequencies
function calculateWeightedAverage(scores, round) {
    const freqMap = STATE.frequencyData[round] || {};
    
    // First, group scores by base Pokemon name and count variants
    const baseNameGroups = {};
    
    for (const [opponent, score] of Object.entries(scores)) {
        // Extract base name (removes ability suffix)
        const baseName = extractBaseName(opponent);
        
        if (!baseNameGroups[baseName]) {
            baseNameGroups[baseName] = {
                scores: [],
                baseFrequency: freqMap[baseName] || CONFIG.defaults.defaultFrequencyWeight
            };
        }
        
        baseNameGroups[baseName].scores.push(score);
    }
    
    // Calculate weighted average with split frequencies
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const [baseName, group] of Object.entries(baseNameGroups)) {
        const numVariants = group.scores.length;
        const weightPerVariant = group.baseFrequency / numVariants;
        
        group.scores.forEach(score => {
            totalWeightedScore += score * weightPerVariant;
            totalWeight += weightPerVariant;
        });
    }
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

// Get frequency round from data key
function getFrequencyRoundFromDataKey(dataKey) {
    if (dataKey === 'round1') return 'round1';
    if (dataKey.startsWith('round2')) return 'round2';
    if (dataKey.startsWith('round3')) return 'round3';
    if (dataKey.startsWith('round4')) return 'round4';
    if (dataKey.startsWith('round5')) return 'round5';
    return 'round1';
}

// Parse team string (e.g., "Vaporeon4/Latios8/Scizor4")
function parseTeamString(teamString) {
    const sets = teamString.split(/[,/]/).map(s => s.trim()).filter(s => s.length > 0);
    const parsedSets = [];
    
    sets.forEach(setStr => {
        // Try to match Pokemon-Number or PokemonNumber format
        let match = setStr.match(/^(.+?)-(\d+)$/); // Match "Pokemon-1" format
        if (!match) {
            match = setStr.match(/^(.+?)(\d+)$/); // Match "Pokemon1" format
        }
        
        if (match) {
            const pokemon = match[1];
            const setNum = match[2];
            parsedSets.push(`${pokemon}-${setNum}`);
        }
    });
    
    return parsedSets;
}

// Update button states for a selector group
function updateButtonStates(buttonElement, containerSelector) {
    const container = buttonElement.closest(containerSelector);
    if (!container) return;
    
    container.querySelectorAll('.data-button').forEach(btn => {
        btn.classList.remove('active');
    });
    buttonElement.classList.add('active');
}

// Show status message
function showStatus(statusElementId, message, type = 'info') {
    const statusEl = document.getElementById(statusElementId);
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
}

// Hide status message
function hideStatus(statusElementId) {
    const statusEl = document.getElementById(statusElementId);
    if (statusEl) {
        statusEl.classList.add('hidden');
    }
}

// Combine matchup abilities with the same scores
function combineMatchupAbilities(matchups) {
    const result = [];
    const used = new Set();
    
    for (let i = 0; i < matchups.length; i++) {
        if (used.has(i)) continue;
        
        const current = matchups[i];
        const currentParsed = parseSetName(current.name);
        
        // If no ability specified, add as-is
        if (!currentParsed.ability) {
            result.push({
                displayName: current.name,
                score: current.score
            });
            used.add(i);
            continue;
        }
        
        // Look for other sets with same base name and same score
        const matchingAbilities = [currentParsed.ability];
        for (let j = i + 1; j < matchups.length; j++) {
            if (used.has(j)) continue;
            
            const other = matchups[j];
            const otherParsed = parseSetName(other.name);
            
            // Check if same base name and same score (within 0.001 tolerance)
            if (otherParsed.ability && 
                currentParsed.baseName === otherParsed.baseName &&
                Math.abs(current.score - other.score) < 0.001) {
                matchingAbilities.push(otherParsed.ability);
                used.add(j);
            }
        }
        
        // Create display name
        let displayName;
        if (matchingAbilities.length > 1) {
            displayName = `${currentParsed.baseName}-${matchingAbilities.join('/')}`;
        } else {
            displayName = current.name;
        }
        
        result.push({
            displayName: displayName,
            score: current.score
        });
        used.add(i);
    }
    
    return result;
}

// Compact set names for display
function compactSetNames(setNames) {
    // Group by pokemon-ability
    const grouped = {};
    
    setNames.forEach(name => {
        const parts = name.split('-');
        const pokemonName = parts[0];
        const setNum = parts[1];
        const ability = parts.length > 2 ? parts.slice(2).join('-') : null;
        
        const key = ability ? `${pokemonName}|||${ability}` : `${pokemonName}|||none`;
        
        if (!grouped[key]) {
            grouped[key] = {
                pokemon: pokemonName,
                ability: ability,
                sets: []
            };
        }
        
        grouped[key].sets.push(setNum);
    });
    
    // Sort sets within each group numerically
    Object.values(grouped).forEach(group => {
        group.sets.sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            return numA - numB;
        });
    });
    
    // Build display strings
    const displayParts = Object.values(grouped).map(group => {
        const setsText = group.sets.join('/');
        if (group.ability) {
            return `${group.pokemon}-${setsText}-${group.ability}`;
        } else {
            return `${group.pokemon}-${setsText}`;
        }
    });
    
    return displayParts.join(', ');
}

// Generic dropdown setup
function setupDropdown(inputId, dropdownId, searchFunction, selectFunction, maxResults = CONFIG.defaults.maxDropdownItems) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    
    if (!input || !dropdown) return;
    
    input.addEventListener('input', async function() {
        const query = this.value.toLowerCase();
        
        if (query.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        const results = await searchFunction(query);
        
        dropdown.innerHTML = '';
        if (results && results.length > 0) {
            results.slice(0, maxResults).forEach(item => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = item.display || item.name || item;
                div.addEventListener('click', () => {
                    selectFunction(item);
                    dropdown.style.display = 'none';
                });
                dropdown.appendChild(div);
            });
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}