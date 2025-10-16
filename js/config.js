// Configuration and Constants

const CONFIG = {
    // Data file paths
    dataSetFiles: {
        'round1': 'matchupscores/set1matchups.json',
        'round2table': 'matchupscores/set2matchupstable.json',
        'round2opponents': 'matchupscores/set2matchupsopponents.json',
        'round3table': 'matchupscores/set3matchupstable.json',
        'round3opponents': 'matchupscores/set3matchupsopponents.json',
        'round4table': 'matchupscores/set4matchupstable.json',
        'round4elevations': 'matchupscores/set4matchupselevation.json',
        'round4opponents': 'matchupscores/set4matchupsopponents.json',
        'round5p15iv': 'matchupscores/round5pmatchupstable15IV.json',
        'round5p21iv': 'matchupscores/round5pmatchupstable21IV.json',
        'round5p31iv': 'matchupscores/round5pmatchupstable31IV.json',
        'round5popponents': 'matchupscores/round5pmatchupsopponents.json'
    },

    frequencyFiles: {
        'round1': 'frequencies/round_1_frequencies.json',
        'round2': 'frequencies/round_2_frequencies.json',
        'round3': 'frequencies/round_3_frequencies.json',
        'round4': 'frequencies/round_4_frequencies.json',
        'round5': 'frequencies/round_5plus_frequencies.json'
    },

    // Pokemon types for filtering
    pokemonTypes: [
        'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
        'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
        'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel'
    ],

    // Default values
    defaults: {
        maxDropdownItems: 15,
        maxSearchResults: 20,
        defaultFrequencyWeight: 1.0
    }
};

// Global state
const STATE = {
    // Overview tab
    currentData: null,
    currentDataSet: 'round1',
    overviewData: null,
    
    // Search tab
    searchData: null,
    currentSearchDataSet: 'round5p31iv',
    currentSelectedSet: null,
    currentMatchups: null,
    
    // Draft tab
    draftRound: 'round5',
    draftType: 'table',
    draftTeam: [null, null, null, null, null, null],
    draftDataCache: {},
    swapYourTeam: [null, null, null],
    swapOpponentTeam: [
        {pokemon: null, sets: ['any'], ignore: false},
        {pokemon: null, sets: ['any'], ignore: false},
        {pokemon: null, sets: ['any'], ignore: false}
    ],
    
    // Shared data
    pokemonData: null,
    frequencyData: {}
};