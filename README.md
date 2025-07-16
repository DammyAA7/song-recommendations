<div align="center" class="text-center">
<h1>SPOTIFY FRIEND SONG RECOMMENDATION TOOL</h1>
<p><em>Discover Music, Share Joy, Connect Instantly</em></p>

<img alt="last-commit" src="https://img.shields.io/github/last-commit/DammyAA7/song-recommendations?style=flat&logo=git&logoColor=white&color=0080ff" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="repo-top-language" src="https://img.shields.io/github/languages/top/DammyAA7/song-recommendations?style=flat&color=0080ff" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="repo-language-count" src="https://img.shields.io/github/languages/count/DammyAA7/song-recommendations?style=flat&color=0080ff" class="inline-block mx-1" style="margin: 0px 2px;">

</div>

A Flask-based API that leverages the Spotify Web API for user authentication and song recommendations. The application uses a PostgreSQL(Supabase) database to store user data, recommendations, and OAuth tokens.

---

## Features

- **Spotify OAuth 2.0 Integration:** Securely authenticate users via their Spotify accounts.
- **Persistent Sessions:** Keeps users logged in across sessions.
- **Token Management:** Automatically handles refreshing of expired access tokens.
- **User Profile:** Fetches and stores user profile information from Spotify.
- **Chrome Extension:** A companion browser extension to interact with the API from the browser.
- **Song Recommendations:**
  - Recommend songs to other users.
  - Get recommendations from other users.
  - Get recommendations based on an artist's genre.

---

## Technologies

<div align="center">
<p><em>Built with the tools and technologies:</em></p>
<img alt="Flask" src="https://img.shields.io/badge/Flask-000000.svg?style=flat&logo=Flask&logoColor=white" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26.svg?style=flat&logo=HTML5&logoColor=white" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6.svg?style=flat&logo=CSS3&logoColor=white" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat&logo=JavaScript&logoColor=black" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E.svg?style=flat&logo=Supabase&logoColor=white" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="Heroku" src="https://img.shields.io/badge/Heroku-430098.svg?style=flat&logo=Heroku&logoColor=white" class="inline-block mx-1" style="margin: 0px 2px;">
<img alt="Python" src="https://img.shields.io/badge/Python-3776AB.svg?style=flat&logo=Python&logoColor=white" class="inline-block mx-1" style="margin: 0px 2px;">
</div>

---

## Prerequisites

- Python 3.8 or higher
- `pip` for package management
- A PostgreSQL database instance (the free tier from Supabase is a good option)
- A Spotify Developer account and an application to get API credentials.

---

## Installation & Setup

### Backend

1.  **Clone the repository**

    ```bash
    git clone https://github.com/DammyAA7/song-recommendations.git
    cd song-recommendations
    ```

2.  **Create and activate a virtual environment**

    ```bash
    python3 -m venv .venv
    source .venv/bin/activate      # On macOS/Linux
    .venv\Scripts\activate.bat     # On Windows
    ```

3.  **Install dependencies**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up Environment Variables**

    Create a file named `.env` in the root of the project and add the following variables. These are essential for connecting to the database and the Spotify API.

    ```ini
    # PostgreSQL Database URL
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

    # Spotify API Credentials
    SPOTIFY_CLIENT_ID="your_spotify_client_id"
    SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
    SPOTIFY_REDIRECT_URI="http://127.0.0.1:5000/callback"

    # Flask Session Secret Key
    SESSION_SECRET_KEY="a_strong_and_random_secret_key"
    ```

    **Note:** For the `SPOTIFY_REDIRECT_URI`, make sure to add this exact URI to your Spotify application settings on the developer dashboard.

5.  **Database Setup**

    The `schema.sql` file contains the necessary SQL commands to create the database tables. Connect to your PostgreSQL instance and run the script.

    ```bash
    psql -d YOUR_DATABASE_NAME -a -f schema.sql
    ```

6.  **Run the application**

    ```bash
    flask run
    ```

    The server will run at `http://127.0.0.1:5000/`.

### Chrome Extension

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** by toggling the switch in the top-right corner.
3.  Click on the **"Load unpacked"** button.
4.  Select the `Extension` folder from this project's directory.

---

## API Endpoints

### Authentication

-   **`GET /login`**

    Initiates the Spotify authentication process. Returns a JSON object with the Spotify authorization URL.

-   **`GET /callback`**

    The redirect URI after the user authorizes the application on Spotify. It exchanges the authorization code for an access token and refresh token, stores them, and fetches the user's profile.

-   **`GET /check_auth`**

    Checks if the current user is authenticated. Requires a valid session cookie.

-   **`POST /logout`**

    Logs the user out by clearing the session.

### Recommendations

-   **`PUT /recommend`**

    Recommends a song to another user. Requires a JSON body with `user_id`, `friend_id`, and `song_id`.

-   **`GET /recommend/user/<user_id>`**

    Gets a list of songs recommended to a specific user.

-   **`GET /recommend/artist/<song_id>`**

    Gets song recommendations based on the genre of the artist of the given `song_id`.

---

## License

This project is released under the MIT License. Feel free to copy, modify, and share.
