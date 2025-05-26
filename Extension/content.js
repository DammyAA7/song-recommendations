// Wait for Spotify to load
function waitForSpotify() {
    const checkInterval = setInterval(() => {
        const playerControls = document.querySelector('[data-testid="player-controls"]');
        if (playerControls) {
            clearInterval(checkInterval);
            addCustomButton();
        }
    }, 1000);
}

function addCustomButton() {
    // Check if button already exists
    if (document.getElementById('custom-spotify-button')) {
        return;
    }

    // Create the button
    const button = document.createElement('button');
    button.id = 'custom-spotify-button';
    button.innerHTML = 'Recommend';
    button.className = 'custom-spotify-btn';
    button.title = 'Recommend this track';

    // Add click handler
    button.addEventListener('click', async () => {
        printToConsole('Button clicked, calling Flask API...');
        await callFlaskAPI();
    });

    // Find the search bar container and add button next to it
    const searchContainer = document.querySelector('._b3hhmbWtOY8_1M1mM1H');
    if (searchContainer && searchContainer.parentNode) {
        // Create a wrapper div to hold the button
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'custom-button-wrapper';
        buttonWrapper.appendChild(button);

        // Insert the button after the search container
        searchContainer.parentNode.insertBefore(buttonWrapper, searchContainer.nextSibling);
    } else {
        // Fallback: try to find the top bar area
        const topBar = document.querySelector('.gj5VcIUC9oD2p4BsxzGE');
        if (topBar) {
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'custom-button-wrapper';
            buttonWrapper.appendChild(button);
            topBar.appendChild(buttonWrapper);
        }
    }
}

function printToConsole(message) {
    console.log(`[Custom Spotify Button] ${message}`);
}

async function callFlaskAPI() {
    const button = document.getElementById('custom-spotify-button');
    const originalText = button.innerHTML;

    try {
        // Show loading state
        button.innerHTML = '⏳ Loading...';
        button.disabled = true;

        // Call your Flask API
        const response = await fetch('http://127.0.0.1:5000/login', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log('API Response received successfully:', await response.json());
            // Show success feedback
            button.innerHTML = '✅ Success!';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Error calling Flask API:', error);

        // Show error feedback
        button.innerHTML = '❌ Error';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    } finally {
        button.disabled = false;
    }
}

// Handle Spotify's dynamic loading
function observeChanges() {
    const observer = new MutationObserver(() => {
        if (!document.getElementById('custom-spotify-button')) {
            addCustomButton();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize
waitForSpotify();
observeChanges();