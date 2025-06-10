-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY, -- Auto-incrementing primary key using SERIAL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the user was created
    spotify_user_id VARCHAR(255) NOT NULL UNIQUE, -- Unique identifier for the user in Spotify
    spotify_display_name VARCHAR(255) NOT NULL, -- Display name of the user in Spotify
    spotify_email VARCHAR(255) UNIQUE, -- Email of the user in Spotify
    spotify_avatar_url TEXT, -- Profile URL of the user in Spotify
    
    access_token TEXT, -- Access token for Spotify API
    refresh_token TEXT, -- Refresh token for Spotify API
    token_expiry TIMESTAMP -- Expiry time for the access token
);

-- Friends table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS friends (
    user_id VARCHAR(255) NOT NULL, -- Identifier for the user, cannot be null
    friend_id VARCHAR(255) NOT NULL, -- Identifier for the friend, cannot be null
    PRIMARY KEY (user_id, friend_id), -- Composite primary key
    FOREIGN KEY (user_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE, -- Foreign key with cascade delete
    FOREIGN KEY (friend_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE -- Foreign key with cascade delete
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY, -- Auto-incrementing primary key using SERIAL
    user_id VARCHAR(255) NOT NULL, -- Identifier for the user, cannot be null
    friend_id VARCHAR(255) NOT NULL, -- Identifier for the friend, cannot be null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the recommendation was created
    FOREIGN KEY (user_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE, -- Foreign key with cascade delete
    FOREIGN KEY (friend_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE -- Foreign key with cascade delete
);

-- Index to optimize queries on recommendations by friend and creation time
CREATE INDEX IF NOT EXISTS idx_recommendations_friend_created
    ON recommendations (friend_id, created_at DESC);

-- Recommendation songs table (junction table with additional attributes)
CREATE TABLE IF NOT EXISTS recommendation_songs (
    recommendation_id INTEGER NOT NULL,
    song_id VARCHAR(255) NOT NULL,
    like_dislike BOOLEAN DEFAULT NULL, -- Indicates if the song is liked/disliked
    PRIMARY KEY (recommendation_id, song_id),
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_comments (
    recommendation_id INTEGER NOT NULL,
    sent_comment TEXT NOT NULL, -- Comment sent by the user
    received_comment TEXT, -- Comment received by the friend
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE -- Foreign key with cascade delete
);

-- Index to optimize queries on recommendation comments by recommendation ID
CREATE INDEX IF NOT EXISTS idx_recommendation_comments_recommendation_id
    ON recommendation_comments (recommendation_id);

CREATE TABLE IF NOT EXISTS songs (
    song_id VARCHAR(255) PRIMARY KEY, -- Unique identifier for the song
    title VARCHAR(255) NOT NULL, -- Title of the song
    artist VARCHAR(255) NOT NULL, -- Artist of the song
    track_cover TEXT -- URL to the song on Spotify
);

CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY, -- Auto-incrementing primary key using SERIAL
    sender_id VARCHAR(255) NOT NULL, -- Identifier for the user, cannot be null
    receiver_id VARCHAR(255) NOT NULL, -- Identifier for the friend, cannot be null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the request was created
    FOREIGN KEY (sender_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE, -- Foreign key with cascade delete
    FOREIGN KEY (receiver_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE -- Foreign key with cascade delete
);



-- OAuth states table for storing OAuth states
CREATE TABLE IF NOT EXISTS oauth_states (
    id SERIAL PRIMARY KEY, -- Auto-incrementing primary key using SERIAL
    state TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Using TIMESTAMP instead of DATETIME
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_created_at ON oauth_states(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_friend_created ON requests (receiver_id, created_at DESC);
