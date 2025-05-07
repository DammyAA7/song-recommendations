# Music Recommendation API

A simple Flask application with an SQLite database that provides song data, recommendations by artist genre and recomend songs to friends. This project helped me improve my SQL skills and get hands-on experience with a Python framework.

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

### Recommend a Song to a Friend

* **URL:** `/recommend`

* **Method:** `PUT`

* **Description:** Recommends a song from one user to another. A user cannot recommend the same song more than once to the same friend, nor can they recommend a song to themselves.

* **Request Body:** JSON object containing:

  * `user_id` (integer): ID of the user making the recommendation
  * `friend_id` (integer): ID of the user receiving the recommendation
  * `song_id` (integer): ID of the song being recommended

#### Sample Request

```bash
curl -X PUT http://127.0.0.1:5000/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "friend_id": 2, "song_id": 5}'
```

#### Success Response

* **Status Code:** `201 Created`

```json
{ "message": "Song successfully recommended!" }
```

#### Error Responses

* **Missing fields:**

  * **Status Code:** `400 Bad Request`

  ```json
  { "error": "Missing user_id, friend_id or song_id" }
  ```

* **Self-recommendation:**

  * **Status Code:** `400 Bad Request`

  ```json
  { "error": "Cannot recommend a song to yourself" }
  ```

* **User does not exist:**

  * **Status Code:** `404 Not Found`

  ```json
  { "error": "Recommending user does not exist" }
  ```

* **Friend does not exist:**

  * **Status Code:** `404 Not Found`

  ```json
  { "error": "Friend user does not exist" }
  ```

* **Song does not exist:**

  * **Status Code:** `404 Not Found`

  ```json
  { "error": "Song does not exist" }
  ```

* **Duplicate recommendation:**

  * **Status Code:** `200 OK`

  ```json
  { "message": "Song has already been recommended to this user" }
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
