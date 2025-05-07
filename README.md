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
- NextJs

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
   python3 app.py
   ```

2. The server runs by default at `http://127.0.0.1:5000/` in debug mode.

---

---

## API Endpoints

### Get All Songs

* **URL:** `/songs`
* **Method:** `GET`
* **Description:** Returns a JSON list of all songs with their IDs, titles, artist names, release years, and play counts.

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
  }
]
```

---

### Recommend by Artist Genre

* **URL:** `/recommend/artist/<song_id>`
* **Method:** `GET`
* **Description:** Returns a JSON list of songs in the same genre as the provided `song_id`, excluding that song itself.

#### URL Parameters

* `song_id`: Integer — ID of the reference song.

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

```json
{ "error": "Song not found" }
```

---

### Get User Recommendations

* **URL:** `/recommend/user/<user_id>`
* **Method:** `GET`
* **Description:** Returns songs recommended *to* the user (i.e. `friend_id`) by other users. Includes the recommending user ID, song details, and artist info.

#### URL Parameters

* `user_id`: Integer — ID of the user to whom songs were recommended.

#### Sample Request

```bash
curl http://127.0.0.1:5000/recommend/user/2
```

#### Sample Response

```json
[
  {
    "song_id": 3,
    "title": "Starboy",
    "artist": "The Weeknd",
    "year": 2016,
    "play_count": 1400,
    "recommended_by": 1
  }
]
```

---

### Welcome Message

* **URL:** `/`
* **Method:** `GET`
* **Description:** Returns a simple welcome message to confirm the API is running.

#### Sample Response

```text
Welcome to the Song Recommendation API!
```

---

## Next Steps

- Add POST endpoints to create, update, and delete song recommendations.
- Create interactive frontend (preferebly nextjs in TypeScript)
- Add user authentication and like tracking.
- Switch to a more robust database like PostgreSQL.

---

## License

This project is released under the MIT License. Feel free to copy, modify, and share.
