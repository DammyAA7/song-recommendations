# Music Catalog API

A simple Flask application with an SQLite database that provides song data and recommendations by artist genre. This project helped me improve my SQL skills and get hands-on experience with a Python framework.

---

## Features

- Fetch all songs with artist names, release years, and play counts.
- Get song recommendations based on the genre of a given song.
- Easy setup with SQLite.

---

## Technologies

- Python 3
- Flask
- SQLite

---

## Prerequisites

- Python 3.6 or higher installed on your system.
- `pip` for package management.

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/DammyAA7/song-recommendations.git
   cd song-recommendations
   ```

2. **Create and activate a virtual environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate      # On macOS/Linux
   venv\Scripts\activate.bat   # On Windows
   ```

3. **Install dependencies**

   ```bash
   pip install Flask
   ```

---

## Database Setup

The project uses an SQLite database named `catalog.db`. A schema script is provided to set up the tables and seed data.

1. **Open the SQLite shell**

   ```bash
   sqlite3 catalog.db
   ```

2. **Run the schema and seed SQL**

   ```sql
   -- Create tables
   CREATE TABLE IF NOT EXISTS songs (
     song_id INTEGER PRIMARY KEY AUTOINCREMENT,
     title VARCHAR(255) NOT NULL,
     artist_id INT NOT NULL,
     year INT,
     play_count INT DEFAULT 0
   );

   CREATE TABLE IF NOT EXISTS artists (
     artist_id INTEGER PRIMARY KEY AUTOINCREMENT,
     name VARCHAR(255) NOT NULL,
     genre VARCHAR(255)
   );

   CREATE TABLE IF NOT EXISTS likes (
     song_id INT NOT NULL,
     user_id INT NOT NULL,
     PRIMARY KEY (song_id, user_id)
   );

   -- Insert sample artists
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

   -- Insert sample songs
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
   ```

3. **Exit the shell**

   ```bash
   .exit
   ```

---

## Running the Application

1. **Start the Flask server**

   ```bash
   python app.py
   ```

2. The server runs by default at `http://127.0.0.1:5000/` in debug mode.

---

## API Endpoints

### Get All Songs

- **URL:** `/songs`
- **Method:** `GET`
- **Description:** Returns a JSON list of all songs with their IDs, titles, artist names, release years, and play counts.

#### Sample Request

```bash
curl http://127.0.0.1:5000/songs
```

#### Sample Response

```json
[
  {
    "song_id": 1,
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "year": 2019,
    "play_count": 1500
  },
  ...
]
```

### Recommend by Artist Genre

- **URL:** `/recommend/artist/<song_id>`
- **Method:** `GET`
- **Description:** Returns a JSON list of songs by the same genre as the song with the given `song_id`, excluding itself.
- **URL Parameters:**

  - `song_id`: integer ID of the reference song.

#### Sample Request

```bash
curl http://127.0.0.1:5000/recommend/artist/1
```

#### Sample Response

```json
[
  {
    "song_id": 5,
    "title": "Save Your Tears",
    "artist": "The Weeknd",
    "play_count": 1300,
    "genre": "R&B"
  }
]
```

#### Error Handling

- If the `song_id` does not exist, the API returns a 404 status and an error message:

```json
{ "error": "Song not found" }
```

---

## Next Steps

- Add POST endpoints to create, update, and delete songs and artists.
- Add user authentication and like tracking.
- Switch to a more robust database like PostgreSQL.

---

## License

This project is released under the MIT License. Feel free to copy, modify, and share.
