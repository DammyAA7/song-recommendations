CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each user, auto-incremented
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the user was created, defaults to current time
    spotify_user_id VARCHAR(255) NOT NULL UNIQUE, -- Unique identifier for the user in Spotify
    spotify_display_name VARCHAR(255) NOT NULL, -- Display name of the user in Spotify
    spotify_email VARCHAR(255) NOT NULL UNIQUE, -- Email of the user in Spotify
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

CREATE TABLE IF NOT EXISTS recommendationSong (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each recommendation, auto-incremented
    recommendationId INT NOT NULL, -- Identifier for the recommendation, cannot be null
    song_id INT NOT NULL, -- Identifier for the song, cannot be null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the recommendation was created, defaults to current time
    FOREIGN KEY (recommendationId) REFERENCES recommendations(id), -- Foreign key reference to recommendations table
    FOREIGN KEY (song_id) REFERENCES songs(song_id) -- Foreign key reference to songs table
);

CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each recommendation, auto-incremented
    user_id INT NOT NULL, -- Identifier for the user, cannot be null
    friend_id INT NOT NULL, -- Identifier for the friend, cannot be null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the recommendation was created, defaults to current time
    FOREIGN KEY (user_id) REFERENCES users(user_id), -- Foreign key reference to users table
    FOREIGN KEY (friend_id) REFERENCES users(user_id) -- Foreign key reference to users table
);

CREATE TABLE IF NOT EXISTS songs (
    song_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each song, auto-incremented
    title VARCHAR(255) NOT NULL, -- Title of the song, cannot be null
    artist_id INT NOT NULL, -- Identifier for the artist, cannot be null
    year INT, -- Year the song was released
    play_count INT DEFAULT 0 -- Number of times the song has been played, defaults to 0
);

CREATE TABLE IF NOT EXISTS artists (
    artist_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each artist, auto-incremented
    name VARCHAR(255) NOT NULL, -- Name of the artist, cannot be null
    genre VARCHAR(255) -- Genre of the artist
);

CREATE TABLE IF NOT EXISTS likes (
    song_id INT NOT NULL, -- Identifier for the song, cannot be null
    user_id INT NOT NULL, -- Identifier for the user, cannot be null
    PRIMARY KEY (song_id, user_id) -- Composite primary key
);

INSERT INTO likes (song_id, user_id) VALUES 
(1, 1), -- John likes song 1
(11, 1), -- John likes song 11
(7, 1), -- John likes song 7
(8, 1), -- John likes song 8
(1, 2), -- Jane likes song 1
(2, 2), -- Jane likes song 2
(5, 2), -- Jane likes song 5
(3, 2), -- Jane likes song 3
(4, 2), -- Jane likes song 4
(6, 2), -- Jane likes song 6
(9, 2); -- Jane likes song 9

INSERT INTO recommendations (user_id, friend_id) VALUES 
(1, 2), -- John recommends to Jane
(2, 1); -- Jane recommends to John

INSERT INTO recommendationSong (recommendationId, song_id) VALUES 
(1, 1), -- John recommends song 1 to Jane
(1, 2), -- John recommends song 2 to Jane
(1, 3), -- John recommends song 3 to Jane
(2, 4), -- Jane recommends song 4 to John
(2, 5); -- Jane recommends song 5 to John

INSERT INTO artists (name, genre) VALUES 
('The Weeknd', 'R&B'),
('Harry Styles', 'Pop'),
('Dua Lipa', 'Pop'),
('Justin Bieber', 'Pop'),
('Olivia Rodrigo', 'Pop'),
('Doja Cat', 'Pop'),
('Lil Nas X', 'Hip-Hop'),
('The Kid LAROI', 'Pop'),
('Ed Sheeran', 'Pop'),
('Glass Animals', 'Indie'),
('BTS', 'K-Pop');

INSERT INTO songs (title, artist_id, year, play_count) VALUES 
('Blinding Lights', 1, 2019, 1500),
('Watermelon Sugar', 2, 2019, 1200),
('Levitating', 3, 2020, 1100),
('Peaches', 4, 2021, 900),
('Save Your Tears', 1, 2020, 1300),
('Good 4 U', 5, 2021, 800),
('Kiss Me More', 6, 2021, 700),
('Drivers License', 5, 2021, 1400),
('Montero', 7, 2021, 1000),
('Stay', 8, 2021, 950),
('Bad Habits', 9, 2021, 850),
('Deja Vu', 5, 2021, 750),
('Industry Baby', 7, 2021, 650),
('Heat Waves', 10, 2020, 600),
('Butter', 11, 2021, 550);