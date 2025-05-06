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

**Run the command in your terminal to run the schema.sql file and create the database**

   ```bash
   sqlite3 catalog.db < /path/to/schema.sql
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
