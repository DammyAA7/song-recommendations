CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each user, auto-incremented
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the user was created, defaults to current time
    spotify_user_id VARCHAR(255) NOT NULL UNIQUE, -- Unique identifier for the user in Spotify
    spotify_display_name VARCHAR(255) NOT NULL, -- Display name of the user in Spotify
    spotify_email VARCHAR(255) UNIQUE, -- Email of the user in Spotify
    spotify_avatar_url TEXT, -- Profile URL of the user in Spotify
    
    access_token TEXT, -- Access token for Spotify API
    refresh_token TEXT, -- Refresh token for Spotify API
    token_expiry TIMESTAMP -- Expiry time for the access token
);

CREATE TABLE IF NOT EXISTS friends (
    user_id INT NOT NULL, -- Identifier for the user, cannot be null
    friend_id INT NOT NULL, -- Identifier for the friend, cannot be null
    PRIMARY KEY (user_id, friend_id), -- Composite primary key
    FOREIGN KEY (user_id) REFERENCES users(user_id), -- Foreign key reference to users table
    FOREIGN KEY (friend_id) REFERENCES users(user_id) -- Foreign key reference to users table
);

CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each recommendation, auto-incremented
    user_id INT NOT NULL, -- Identifier for the user, cannot be null
    friend_id INT NOT NULL, -- Identifier for the friend, cannot be null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the recommendation was created, defaults to current time
    FOREIGN KEY (user_id) REFERENCES users(user_id), -- Foreign key reference to users table
    FOREIGN KEY (friend_id) REFERENCES users(user_id) -- Foreign key reference to users table
);

CREATE INDEX IF NOT EXISTS idx_recommendations_friend_created
    ON recommendations (friend_id, created_at DESC); -- Index to optimize queries on recommendations by friend and creation time

CREATE TABLE IF NOT EXISTS recommendationSongs (
    recommendation_id INTEGER NOT NULL,
    song_id           INTEGER NOT NULL,
    like_dislike BOOLEAN DEFAULT NULL, -- Indicates if the song is liked/disliked
    PRIMARY KEY (recommendation_id, song_id),
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id)          REFERENCES songs(song_id)      ON DELETE CASCADE
);


-- Create table for storing OAuth states
CREATE TABLE IF NOT EXISTS oauth_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_created_at ON oauth_states(created_at);
