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

async function handleAuthFlow() {
    const authBtn = document.querySelector('#authorize-btn');
    if (!authBtn) return;
    
    authBtn.innerHTML = '⏳ Connecting...';
    authBtn.disabled = true;

    try {
        // First, let's check if we have any existing session
        console.log('Checking existing session...');
        
        const response = await fetch('http://127.0.0.1:5000/login', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login response:', data);
            
            if (data.auth_url) {
                // Open popup for authorization
                const authWindow = window.open(
                    data.auth_url,
                    'spotify-auth',
                    'width=500,height=600,resizable=yes,scrollbars=yes'
                );

                // Handle the auth flow
                await handleAuthWindow(authWindow);
                
                // After successful auth, close current popup and show friends
                console.log('Auth completed successfully, showing friends popup');
                closePopup();
                setTimeout(() => showPopupFriends(), 300);
                
            } else {
                throw new Error('No auth URL received');
            }
        } else {
            const errorData = await response.json();
            console.error('Login API error:', errorData);
            throw new Error(`Login failed: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Auth flow error:', error);
        authBtn.innerHTML = 'Try Again';
        authBtn.disabled = false;
        
        // Show error to user
        showAuthError(error.message);
    }
}

async function handleAuthWindow(authWindow) {
    return new Promise((resolve, reject) => {
        let resolved = false;
        
        // Set timeout for the entire auth process
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                if (!authWindow.closed) {
                    authWindow.close();
                }
                reject(new Error('Authentication timeout'));
            }
        }, 60000); // 1 minute timeout

        // Check if popup was closed manually
        const authCheckInterval = setInterval(() => {
            try {
                if (authWindow.closed && !resolved) {
                    resolved = true;
                    clearInterval(authCheckInterval);
                    clearTimeout(timeout);
                    
                    // Check if auth was successful
                    setTimeout(() => {
                        checkAuthStatus().then(success => {
                            if (success) {
                                resolve();
                            } else {
                                reject(new Error('Authentication was cancelled or failed'));
                            }
                        });
                    }, 500); // Small delay to allow session to update
                }
            } catch (e) {
                // Ignore cross-origin errors
            }
        }, 1000);

        // Listen for postMessage from callback
        
        const messageHandler = (event) => {
            if (event.data === 'auth_success' && !resolved) {
                resolved = true;
                clearInterval(authCheckInterval);
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                
                if (!authWindow.closed) {
                    authWindow.close();
                }
                
                // Small delay to ensure session is updated
                setTimeout(() => {
                    resolve();
                }, 500);
            }
        };
        
        window.addEventListener('message', messageHandler);
    });
}

function showAuthError(message) {
    const popup = document.getElementById('spotify-recommend-popup');
    if (!popup) return;
    
    const content = popup.querySelector('.popup-content');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.innerHTML = `
        <div style="background: #ff4444; color: white; padding: 10px; border-radius: 4px; margin: 10px 0;">
            <strong>Authentication Error:</strong> ${message}
        </div>
    `;
    
    // Remove any existing error messages
    const existingError = content.querySelector('.auth-error');
    if (existingError) {
        existingError.remove();
    }
    
    content.insertBefore(errorDiv, content.firstChild);
}

function showPopupFriends() {
    const popup = createBasePopup();
    const content = popup.querySelector('.popup-content');

    // Dummy sent recommendations data (keeping as is)
    const sentRecommendations = [
        { 
            name: 'Alex Johnson', 
            avatar: 'https://i.pravatar.cc/40?img=1',
            count: 3,
            songs: [
                { title: 'Blinding Lights', artist: 'The Weeknd', sentAt: '2 hours ago' },
                { title: 'Good 4 U', artist: 'Olivia Rodrigo', sentAt: '1 day ago' },
                { title: 'Stay', artist: 'The Kid LAROI, Justin Bieber', sentAt: '2 days ago' }
            ]
        },
        { 
            name: 'Sarah Wilson', 
            avatar: 'https://i.pravatar.cc/40?img=2',
            count: 1,
            songs: [
                { title: 'Levitating', artist: 'Dua Lipa', sentAt: '3 hours ago' }
            ]
        }
    ];

    // Dummy received recommendations data (keeping as is)
    const receivedRecommendations = [
        { 
            name: 'Mike Chen', 
            avatar: 'https://i.pravatar.cc/40?img=3',
            count: 2,
            songs: [
                { title: 'Heat Waves', artist: 'Glass Animals', receivedAt: '1 hour ago' },
                { title: 'Bad Habits', artist: 'Ed Sheeran', receivedAt: '4 hours ago' }
            ]
        },
        { 
            name: 'Emma Davis', 
            avatar: 'https://i.pravatar.cc/40?img=4',
            count: 4,
            songs: [
                { title: 'Industry Baby', artist: 'Lil Nas X, Jack Harlow', receivedAt: '30 minutes ago' },
                { title: 'Peaches', artist: 'Justin Bieber', receivedAt: '2 hours ago' },
                { title: 'Kiss Me More', artist: 'Doja Cat, SZA', receivedAt: '1 day ago' },
                { title: 'Montero', artist: 'Lil Nas X', receivedAt: '2 days ago' }
            ]
        }
    ];

    content.innerHTML = `
    <div class="friends-container">
      <div class="popup-header">
        <div class="tab-navigation">
          <button class="tab-btn active" data-tab="friends">Friends</button>
          <button class="tab-btn" data-tab="sent">Sent</button>
          <button class="tab-btn" data-tab="received">Received</button>
        </div>
      </div>
      
      <div class="tab-content" id="friends-tab">
        <div class="add-friend-section">
          <div class="add-friend-form">
            <input type="text" id="friend-input" placeholder="Enter Spotify username URL" class="friend-input">
            <button id="add-friend-btn" class="spotify-btn-primary">Add Friend</button>
          </div>
        </div>
        <div class="friends-list" id="friends-list">
          <div class="loading-message">Loading friends...</div>
        </div>
      </div>

      <div class="tab-content hidden" id="sent-tab">
        <div class="recommendations-list">
          ${sentRecommendations.map(person => `
            <div class="recommendation-person" data-person="${person.name}">
              <div class="person-header">
                <div class="friend-avatar">
                  <img src="${person.avatar}" alt="${person.name}">
                </div>
                <div class="friend-info">
                  <span class="friend-name">${person.name}</span>
                  <span class="friend-status">${person.count} song${person.count > 1 ? 's' : ''} sent</span>
                </div>
                <button class="expand-btn">▼</button>
              </div>
              <div class="songs-list hidden">
                ${person.songs.map(song => `
                  <div class="song-item">
                    <div class="song-info">
                      <span class="song-title">${song.title}</span>
                      <span class="song-artist">${song.artist}</span>
                    </div>
                    <span class="song-time">${song.sentAt}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="tab-content hidden" id="received-tab">
        <div class="recommendations-list">
          ${receivedRecommendations.map(person => `
            <div class="recommendation-person" data-person="${person.name}">
              <div class="person-header">
                <div class="friend-avatar">
                  <img src="${person.avatar}" alt="${person.name}">
                </div>
                <div class="friend-info">
                  <span class="friend-name">${person.name}</span>
                  <span class="friend-status">${person.count} song${person.count > 1 ? 's' : ''} received</span>
                </div>
                <button class="expand-btn">▼</button>
              </div>
              <div class="songs-list hidden">
                ${person.songs.map(song => `
                  <div class="song-item">
                    <div class="song-info">
                      <span class="song-title">${song.title}</span>
                      <span class="song-artist">${song.artist}</span>
                    </div>
                    <span class="song-time">${song.receivedAt}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="popup-footer">
        <button id="debug-friends-btn" class="spotify-btn-secondary">Debug Session</button>
        <button id="logout-btn" class="spotify-btn-secondary">Logout</button>
      </div>
    </div>
  `;

    // Function to extract username from Spotify URL
    function extractSpotifyUsername(input) {
        const trimmedInput = input.trim();
        
        // Check if it's a Spotify URL
        const spotifyUrlRegex = /https:\/\/open\.spotify\.com\/user\/([^?&/]+)/;
        const match = trimmedInput.match(spotifyUrlRegex);
        
        if (match) {
            return match[1]; // Return the captured username
        }
        
        // If not a URL, assume it's already a username
        return trimmedInput;
    }

    // Function to load friends from API
    async function loadFriends() {
        const friendsList = content.querySelector('#friends-list');
        
        try {
            const response = await fetch('http://127.0.0.1:5000/list_friends', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const friends = await response.json();
            
            if (friends.length === 0) {
                friendsList.innerHTML = `
                    <div class="no-friends-message">
                        <p>No friends yet! Add some friends to start sharing music recommendations.</p>
                    </div>
                `;
            } else {
                friendsList.innerHTML = friends.map(friend => `
                    <div class="friend-item" data-friend="${friend.display_name || friend.spotify_user_id}">
                        <div class="friend-avatar">
                            <img src="${friend.avatar_url || 'https://i.pravatar.cc/40?img=1'}" alt="${friend.display_name || friend.spotify_user_id}">
                            <span class="status-indicator online"></span>
                        </div>
                        <div class="friend-info">
                            <span class="friend-name">${friend.display_name || friend.spotify_user_id}</span>
                            <span class="friend-status">online</span>
                        </div>
                        <button class="recommend-btn">Send</button>
                    </div>
                `).join('');
                
                // Add click handlers for recommend buttons
                const recommendBtns = friendsList.querySelectorAll('.recommend-btn');
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
            }
        } catch (error) {
            console.error('Error loading friends:', error);
            friendsList.innerHTML = `
                <div class="error-message">
                    <p>Error loading friends. Please try again later.</p>
                </div>
            `;
        }
    }

    // Function to add a friend
    async function addFriend(friendInput) {
        const addBtn = content.querySelector('#add-friend-btn');
        const input = content.querySelector('#friend-input');
        
        const username = extractSpotifyUsername(friendInput);
        
        if (!username) {
            alert('Please enter a valid Spotify username or profile URL');
            return;
        }

        // Disable button and show loading state
        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        try {
            const response = await fetch('http://127.0.0.1:5000/add_friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    friend_id: username
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Success - clear input and reload friends list
                input.value = '';
                await loadFriends();
                alert('Friend added successfully!');
            } else {
                // Handle specific error cases
                let errorMessage = 'Failed to add friend';
                switch(data.error) {
                    case 'not_following_friend':
                        errorMessage = 'You must be following this user on Spotify to add them as a friend';
                        break;
                    case 'friend_already_exists':
                        errorMessage = 'This user is already your friend';
                        break;
                    case 'cannot_add_yourself':
                        errorMessage = 'You cannot add yourself as a friend';
                        break;
                    case 'friend_id_required':
                        errorMessage = 'Please enter a valid username';
                        break;
                    default:
                        if (data.details) {
                            errorMessage = `Error: ${data.details.error?.message || data.error}`;
                        }
                }
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error adding friend:', error);
            alert('Network error. Please check your connection and try again.');
        } finally {
            // Re-enable button
            addBtn.disabled = false;
            addBtn.textContent = 'Add Friend';
        }
    }

    // Load friends when the popup opens
    loadFriends();

    // Add friend button event listener
    const addFriendBtn = content.querySelector('#add-friend-btn');
    const friendInput = content.querySelector('#friend-input');
    
    addFriendBtn.addEventListener('click', () => {
        const friendInputValue = friendInput.value.trim();
        if (friendInputValue) {
            addFriend(friendInputValue);
        } else {
            alert('Please enter a Spotify username or profile URL');
        }
    });

    // Allow adding friend with Enter key
    friendInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const friendInputValue = friendInput.value.trim();
            if (friendInputValue) {
                addFriend(friendInputValue);
            }
        }
    });

    // Tab switching functionality
    const tabBtns = content.querySelectorAll('.tab-btn');
    const tabContents = content.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));

            // Add active class to clicked tab
            btn.classList.add('active');
            const targetTab = content.querySelector(`#${btn.dataset.tab}-tab`);
            if (targetTab) {
                targetTab.classList.remove('hidden');
            }
        });
    });

    // Expand/collapse functionality for sent and received lists
    const expandBtns = content.querySelectorAll('.expand-btn');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const personItem = btn.closest('.recommendation-person');
            const songsList = personItem.querySelector('.songs-list');
            
            if (songsList.classList.contains('hidden')) {
                songsList.classList.remove('hidden');
                btn.textContent = '▲';
            } else {
                songsList.classList.add('hidden');
                btn.textContent = '▼';
            }
        });
    });

    // Add debug button handler
    const debugBtn = content.querySelector('#debug-friends-btn');
    debugBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/debug_session', {
                credentials: 'include'
            });
            const data = await response.json();
            console.log('Friends Debug Session:', data);
            alert(`Friends Debug Session:\n${JSON.stringify(data, null, 2)}`);
        } catch (error) {
            console.error('Friends Debug error:', error);
            alert('Debug Error: ' + error.message);
        }
    });

    // Add logout handler
    const logoutBtn = content.querySelector('#logout-btn');
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('http://127.0.0.1:5000/logout', { 
                method: 'GET', 
                credentials: 'include'
            });
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
      <div class="debug-info" style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-size: 12px;">
        <button id="debug-session-btn" style="padding: 5px 10px; font-size: 11px;">Check Session Debug</button>
      </div>
    </div>
  `;

    // Add click handler for auth button
    const authBtn = content.querySelector('#authorize-btn');
    authBtn.addEventListener('click', handleAuthFlow);
    
    // Add debug button handler
    const debugBtn = content.querySelector('#debug-session-btn');
    debugBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/debug_session', {
                credentials: 'include'
            });
            const data = await response.json();
            console.log('Session Debug:', data);
            alert(`Session Debug:\n${JSON.stringify(data, null, 2)}`);
        } catch (error) {
            console.error('Debug error:', error);
        }
    });

    document.body.appendChild(popup);
}

async function checkAuthStatus() {
    try {
        console.log('Checking auth status...');
        const response = await fetch('http://127.0.0.1:5000/check_auth', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                console.log('User is authenticated');
                closePopup();
                setTimeout(() => showPopupFriends(), 300);
                return true;
            } else {
                console.log('User is not authenticated:', data.reason);
            }
        } else {
            console.log('Auth check failed with status:', response.status);
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