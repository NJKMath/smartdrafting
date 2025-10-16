// Data Loading Functions

// Load pokemon data from JSON file
async function loadPokemonData() {
    try {
        const response = await fetch('pokemondata.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        STATE.pokemonData = await response.json();
        console.log('Pokemon data loaded successfully');
    } catch (error) {
        console.error('Error loading pokemon data:', error);
    }
}

// Load overview data
async function loadOverviewData() {
    try {
        const response = await fetch('overview_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        STATE.overviewData = await response.json();
        console.log('Overview data loaded successfully');
    } catch (error) {
        console.error('Error loading overview data:', error);
    }
}

// Load frequency data for all rounds
async function loadFrequencyData() {
    for (const [round, filepath] of Object.entries(CONFIG.frequencyFiles)) {
        try {
            const response = await fetch(filepath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Build a lookup map and handle ability variants
            const freqMap = {};
            const baseFrequencies = {};
            
            // First pass: collect base frequencies
            data.forEach(item => {
                freqMap[item.name] = item.frequency;
                
                // Track base name frequencies for ability splitting
                const parsed = parseSetName(item.name);
                if (!parsed.ability) {
                    baseFrequencies[item.name] = item.frequency;
                }
            });
            
            // Second pass: handle ability variants
            data.forEach(item => {
                const parsed = parseSetName(item.name);
                if (parsed.ability && baseFrequencies[parsed.baseName]) {
                    // This is an ability variant, split the base frequency
                    const variants = data.filter(d => {
                        const p = parseSetName(d.name);
                        return p.baseName === parsed.baseName && p.ability;
                    });
                    
                    // Split frequency evenly among variants
                    freqMap[item.name] = baseFrequencies[parsed.baseName] / variants.length;
                }
            });
            
            STATE.frequencyData[round] = freqMap;
            console.log(`Frequency data loaded for ${round}`);
        } catch (error) {
            console.error(`Error loading frequency data for ${round}:`, error);
        }
    }
}

// Load data for a specific dataset (with caching)
async function loadDataFromFile(dataKey) {
    if (STATE.draftDataCache[dataKey]) {
        return STATE.draftDataCache[dataKey];
    }
    
    try {
        const filePath = CONFIG.dataSetFiles[dataKey];
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        STATE.draftDataCache[dataKey] = data;
        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

// Get data key mappings
function getDraftDataKey(round, slotIndex, ivValue) {
    if (round === 'round1') return 'round1';
    if (round === 'round2') return 'round2table';
    if (round === 'round3') return 'round3table';
    if (round === 'round4') {
        if (slotIndex === 0 && ivValue === '15') return 'round4elevations';
        return 'round4table';
    }
    if (round === 'round5') {
        if (ivValue === '15') return 'round5p15iv';
        if (ivValue === '21') return 'round5p21iv';
        if (ivValue === '31') return 'round5p31iv';
        if (ivValue === 'random') return 'round5popponents';
    }
    return 'round1';
}

function getOpponentsDataKey() {
    const round = STATE.draftRound;
    if (round === 'round1') return 'round1';
    if (round === 'round2') return 'round2opponents';
    if (round === 'round3') return 'round3opponents';
    if (round === 'round4') return 'round4opponents';
    if (round === 'round5') return 'round5popponents';
    return 'round1';
}

function getDefaultTableDataKey() {
    const round = STATE.draftRound;
    if (round === 'round1') return 'round1';
    if (round === 'round2') return 'round2table';
    if (round === 'round3') return 'round3table';
    if (round === 'round4') return 'round4table';
    if (round === 'round5') return 'round5p31iv';
    return 'round1';
}

function getDefaultIV() {
    const round = STATE.draftRound;
    if (round === 'round1') return '3';
    if (round === 'round2') return '6';
    if (round === 'round3') return '9';
    if (round === 'round4') return '12';
    if (round === 'round5') return '31';
    return '3';
}

function getSwapYourDataKey(slotIndex, ivValue) {
    if (ivValue === '3') {
        return getOpponentsDataKey();
    }
    return getDraftDataKey(STATE.draftRound, slotIndex, ivValue);
}