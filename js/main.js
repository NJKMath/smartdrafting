// Main Initialization and Event Handlers

// Switch between tabs
function switchTab(tabName, buttonElement) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    buttonElement.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Ensure defaults are selected for Search and Draft tabs
    if (tabName === 'search') {
        ensureSearchDefaults();
    } else if (tabName === 'draft') {
        ensureDraftDefaults();
    }
}

// Ensure search tab has default selections
function ensureSearchDefaults() {
    const searchButtons = document.querySelectorAll('#search-tab .data-button');
    const hasActive = Array.from(searchButtons).some(btn => btn.classList.contains('active'));
    if (!hasActive && searchButtons.length >= 11) {
        searchButtons[10].classList.add('active'); // Round 5+ 31IV
    }
}

// Ensure draft tab has default selections
function ensureDraftDefaults() {
    // Round selection
    const roundButtons = document.querySelectorAll('#draft-tab .search-controls:first-child .data-button');
    const hasActiveRound = Array.from(roundButtons).some(btn => btn.classList.contains('active'));
    if (!hasActiveRound && roundButtons.length > 0) {
        // Activate Round 5+ (last button)
        roundButtons[roundButtons.length - 1].classList.add('active');
    }
    
    // Type selection
    const typeButtons = document.querySelectorAll('#draft-tab .search-controls:nth-child(2) .data-button');
    const hasActiveType = Array.from(typeButtons).some(btn => btn.classList.contains('active'));
    if (!hasActiveType && typeButtons.length > 0) {
        typeButtons[0].classList.add('active'); // Table
    }
}

// Initialize the application
async function initialize() {
    try {
        // Load all data
        await Promise.all([
            loadPokemonData(),
            loadOverviewData(),
            loadFrequencyData()
        ]);
        
        // Initialize overview tab
        await initializeOverview();
        
        // Pre-load search data
        await initializeSearch();
        
        // Initialize draft tab
        initializeDraft();
        
        // Setup global event handlers
        setupGlobalEventHandlers();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        showStatus('loading-status', `Error initializing application: ${error.message}`, 'error');
    }
}

// Initialize overview tab
async function initializeOverview() {
    try {
        if (!STATE.overviewData || !STATE.overviewData['round1']) {
            throw new Error('Overview data not loaded');
        }
        
        STATE.currentData = STATE.overviewData['round1'];
        displayOverview();
        
        hideStatus('loading-status');
        document.getElementById('results-container').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading overview:', error);
        showStatus('loading-status', `Error loading initial data: ${error.message}`, 'error');
    }
}

// Initialize search tab
async function initializeSearch() {
    try {
        const response = await fetch(CONFIG.dataSetFiles['round5p31iv']);
        if (response.ok) {
            STATE.searchData = await response.json();
            STATE.currentSearchDataSet = 'round5p31iv';
            setupPokemonSearch();
            setupPokemonFilterDropdown();
        }
    } catch (error) {
        console.error('Error pre-loading search data:', error);
    }
}

// Initialize draft tab
function initializeDraft() {
    buildDraftSlots();
}

// Setup global event handlers
function setupGlobalEventHandlers() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Esc to close dropdowns
        if (e.key === 'Escape') {
            // Close any open dropdowns
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
            document.querySelectorAll('.set-checkbox-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

// Start the application when DOM is loaded
window.addEventListener('DOMContentLoaded', initialize);