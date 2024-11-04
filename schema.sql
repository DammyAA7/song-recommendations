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