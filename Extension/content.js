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
        await handleRecommendClick();
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

async function handleRecommendClick() {
    if (document.getElementById('spotify-recommend-popup')) {
        togglePopup();
        return;
    }
    const button = document.getElementById('custom-spotify-button');
    const originalText = button.innerHTML;

    try {
        // Show loading state
        button.innerHTML = '⏳ Loading...';
        button.disabled = true;

        // Check authentication
        const authResponse = await fetch('http://127.0.0.1:5000/check_auth', {
            method: 'GET',
            credentials: 'include'
        });

        if (authResponse.ok) {
            const authData = await authResponse.json();
            console.log('Auth Data:', authData);
            console.log('passed auth check');
            if (authData.authenticated) {
                showPopupFriends();
            } else {
                showPopupAuth();
            }
        } else {
            console.error('Failed to check auth:', authResponse.statusText);
            showPopupAuth();
        }
    } catch (error) {
        console.error('Error checking Auth:', error);
        showPopupAuth();
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function createBasePopup() {
    const popup = document.createElement('div');
    popup.id = 'spotify-recommend-popup';
    popup.className = 'spotify-popup';

    popup.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-container">
      <div class="popup-header-controls">
        <button id="close-popup" class="close-btn">×</button>
      </div>
      <div class="popup-content"></div>
    </div>
  `;

    // Add close handler
    const closeBtn = popup.querySelector('#close-popup');
    const overlay = popup.querySelector('.popup-overlay');

    [closeBtn, overlay].forEach(el => {
        el.addEventListener('click', () => closePopup());
    });

    return popup;
}

function togglePopup() {
  const popup = document.getElementById('spotify-recommend-popup');
  if (popup) {
    closePopup();
  }
}

function closePopup() {
  const popup = document.getElementById('spotify-recommend-popup');
  if (popup) {
    popup.remove();
  }
}

function showPopupFriends() {
    const popup = createBasePopup();
    const content = popup.querySelector('.popup-content');

    // Dummy friends data
    const friends = [
        { name: 'Alex Johnson', avatar: 'https://i.pravatar.cc/40?img=1', status: 'online' },
        { name: 'Sarah Wilson', avatar: 'https://i.pravatar.cc/40?img=2', status: 'listening' },
        { name: 'Mike Chen', avatar: 'https://i.pravatar.cc/40?img=3', status: 'online' },
        { name: 'Emma Davis', avatar: 'https://i.pravatar.cc/40?img=4', status: 'offline' },
        { name: 'James Brown', avatar: 'https://i.pravatar.cc/40?img=5', status: 'listening' },
        { name: 'Lisa Garcia', avatar: 'https://i.pravatar.cc/40?img=6', status: 'online' }
    ];

    content.innerHTML = `
    <div class="friends-container">
      <div class="popup-header">
      </div>
      
      <div class="friends-list">
        ${friends.map(friend => `
          <div class="friend-item" data-friend="${friend.name}">
            <div class="friend-avatar">
              <img src="${friend.avatar}" alt="${friend.name}">
              <span class="status-indicator ${friend.status}"></span>
            </div>
            <div class="friend-info">
              <span class="friend-name">${friend.name}</span>
              <span class="friend-status">${friend.status === 'listening' ? '🎵 Listening to music' : friend.status}</span>
            </div>
            <button class="recommend-btn" ${friend.status === 'offline' ? 'disabled' : ''}>
              ${friend.status === 'offline' ? 'Offline' : 'Send'}
            </button>
          </div>
        `).join('')}
      </div>
      
      <div class="popup-footer">
        <button id="logout-btn" class="spotify-btn-secondary">Logout</button>
      </div>
    </div>
  `;

    // Add click handlers for recommend buttons
    const recommendBtns = content.querySelectorAll('.recommend-btn:not([disabled])');
    recommendBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const friendItem = e.target.closest('.friend-item');
            const friendName = friendItem.dataset.friend;

            btn.innerHTML = '✅ Sent';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = 'Send';
                btn.disabled = false;
            }, 2000);
        });
    });

    // Add logout handler
    const logoutBtn = content.querySelector('#logout-btn');
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('http://127.0.0.1:5000/logout', { method: 'POST' });
            closePopup();
        } catch (error) {
            console.error('Logout error:', error);
        }
    });

    document.body.appendChild(popup);
}

function showPopupAuth() {
    const popup = createBasePopup();
    const content = popup.querySelector('.popup-content');

    content.innerHTML = `
    <div class="auth-container">
      <div class="spotify-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#1db954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>
      <h2>Connect to Spotify</h2>
      <p>To recommend music to your friends, you need to authorize this app with your Spotify account.</p>
      <button id="authorize-btn" class="spotify-btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Authorize with Spotify
      </button>
    </div>
  `;

    // Add click handler for auth button
    const authBtn = content.querySelector('#authorize-btn');
    authBtn.addEventListener('click', async () => {
        authBtn.innerHTML = '⏳ Connecting...';
        authBtn.disabled = true;

        try {
            const response = await fetch('http://127.0.0.1:5000/login', {
                method: 'GET',
                credentials: 'include', // Important for session cookies
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.auth_url) {
                    console.log('Opening auth URL:', data.auth_url);
                    
                    // Open in a new popup window instead of iframe
                    const authWindow = window.open(
                        data.auth_url,
                        'spotify-auth',
                        'width=500,height=600,resizable=yes,scrollbars=yes'
                    );

                    // Listen for auth completion
                    const authCheckInterval = setInterval(() => {
                        try {
                            // Check if popup was closed
                            if (authWindow.closed) {
                                clearInterval(authCheckInterval);
                                // Check if auth was successful
                                checkAuthStatus();
                            }
                        } catch (e) {
                            // Popup might be on different domain, ignore cross-origin errors
                        }
                    }, 1000);

                    // Also listen for postMessage
                    const messageHandler = (event) => {
                        if (event.data === 'auth_success') {
                            clearInterval(authCheckInterval);
                            window.removeEventListener('message', messageHandler);
                            authWindow.close();
                            checkAuthStatus();
                        }
                    };
                    window.addEventListener('message', messageHandler);

                    // Fallback: check auth status after some time
                    setTimeout(() => {
                        clearInterval(authCheckInterval);
                        window.removeEventListener('message', messageHandler);
                        if (!authWindow.closed) {
                            authWindow.close();
                        }
                        checkAuthStatus();
                    }, 60000); // 1 minute timeout
                }
            } else {
                throw new Error('Failed to get auth URL');
            }
        } catch (error) {
            console.error('Auth error:', error);
            authBtn.innerHTML = 'Try Again';
            authBtn.disabled = false;
        }
    });

    document.body.appendChild(popup);
}

async function checkAuthStatus() {
    try {
        const response = await fetch('http://127.0.0.1:5000/check_auth', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                closePopup();
                setTimeout(() => showPopupFriends(), 300);
                return true;
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
    return false;
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