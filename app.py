from flask import Flask, jsonify, request, session, redirect
import requests
from flask_cors import CORS
from urllib.parse import urlencode
import sqlite3
import os, secrets

# Initialize the Flask application
app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS for all routes
app.secret_key = os.getenv("SESSION_SECRET_KEY")

# Function to establish a connection to the SQLite database
def get_db_connection():
    conn = sqlite3.connect('catalog.db')
    conn.row_factory = sqlite3.Row  # This allows us to access columns by name
    return conn

# Define a route for the root URL
@app.route('/login')
def login():
    state = secrets.token_urlsafe(16) # Generate a random state parameter
    session['oauth_state'] = state # Store the state before redirecting to the OAuth provider
    scope = "user-follow-read user-read-email"
    params = {
        "client_id": os.getenv("SPOTIFY_CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
        "scope": scope,
        "state": state
    }
    auth_url = "https://accounts.spotify.com/authorize?" + urlencode(params)
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code  = request.args.get('code')  # Get the authorization code from the query parameters
    if not code:
        return jsonify({'error': 'Authorization code not found'}), 400
    # Check if the state parameter matches the one stored in the session
    if request.args.get('state') != session.get('oauth_state'):
        return jsonify({'error': 'State mismatch'}), 400
    
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
    }

    auth_header = requests.auth.HTTPBasicAuth(
        os.getenv("SPOTIFY_CLIENT_ID"),
        os.getenv("SPOTIFY_CLIENT_SECRET")
    )

    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        data=token_data,
        auth=auth_header
    )

    resp.raise_for_status()  # Raise an error for bad responses
    tokens = resp.json()  # Parse the JSON response
    session['access_token'] = tokens['access_token']  # Store the access token in the session
    session['refresh_token'] = tokens['refresh_token']
    session['expires_in'] = tokens['expires_in']
    return redirect("http://127.0.0.1:5000/me")

@app.route('/me')
def me():
    access_token = session.get('access_token')
    refresh_token = session.get('refresh_token')
    token_expiry = session.get('expires_in')
    if not access_token or not refresh_token:
        return jsonify({'error': 'Access token not found'}), 401
    profile = requests.get(
        "https://api.spotify.com/v1/me",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()
    session['user_id'] = profile['id']  # Store the user ID in the session
    
    conn = get_db_connection()
    # Map Spotify fields into your users table columns
    conn.execute("""
    INSERT INTO users (
        spotify_user_id,
        spotify_display_name,
        spotify_email,
        spotify_avatar_url,
        access_token,
        refresh_token,
        token_expiry
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(spotify_user_id) DO UPDATE SET
        spotify_display_name = excluded.spotify_display_name,
        spotify_email        = excluded.spotify_email,
        spotify_avatar_url   = excluded.spotify_avatar_url,
        access_token         = excluded.access_token,
        refresh_token        = excluded.refresh_token,
        token_expiry         = excluded.token_expiry
    """, (
    profile['id'],
    profile.get('display_name'),
    profile.get('email'),
    (profile.get('images') or [{}])[0].get('url'),
    access_token,
    refresh_token,
    token_expiry
    ))
    conn.commit()
    conn.close()
    return jsonify(profile)


@app.route('/logout')
def logout():
    # Clear the session data
    user_id = session.get('user_id')
    if user_id:
        conn = get_db_connection()
        conn.execute("""
            UPDATE users
            SET
                access_token      = NULL,
                refresh_token     = NULL,
                token_expiry  = NULL
            WHERE spotify_user_id = ?
        """, (user_id,))
        conn.commit()
        conn.close()
    session.clear()
    return jsonify({'message': 'Logged out successfully', 'user_id': user_id}), 200

@app.route('/following', methods=['GET'])
def get_following_artists():
    access_token = session.get('access_token')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401

    # Build query parameters. Spotify supports only 'artist' for this endpoint.
    params = {
        'type': '',
        'limit': 50
    }
    # optional cursor-based pagination
    after = request.args.get('after')
    if after:
        params['after'] = after

    resp = requests.get(
        'https://api.spotify.com/v1/me/following',
        headers={'Authorization': f'Bearer {access_token}'},
        params=params
    )
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        return jsonify({'error': 'spotify_api_error', 'details': resp.json()}), resp.status_code

    return jsonify(resp.json())


@app.route('/add_friend', methods=['POST'])
def add_friend():
    access_token = session.get('access_token')
    user_id = session.get('user_id')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    user_id = session.get('user_id')

    friend_id = request.json.get('friend_id')
    if not friend_id:
        return jsonify({'error': 'friend_id_required'}), 400
    if user_id == friend_id:
        return jsonify({'error': 'cannot_add_yourself'}), 400

    # Check if user follows the friend
    # Spotify API does not support API for listing friends friends, but we can check if the user follows them
    params = {'type': 'user','ids': friend_id}
    resp = requests.get(
        'https://api.spotify.com/v1/me/following/contains?',
        headers={'Authorization': f'Bearer {access_token}'},
        params=params
    )

    if resp.status_code != 200:
        return jsonify({'error': 'spotify_api_error', 'details': resp.json()}), resp.status_code
    follows = resp.json()
    if not follows[0]:
        return jsonify({'error': 'not_following_friend'}), 400
    return jsonify({'message': 'friend_added'}), 200





@app.route('/friends', methods=['GET'])
def get_friends():
    # 1) Auth
    token = session.get('access_token')
    if not token:
        return jsonify({'error': 'not_authenticated'}), 401

    # 2) Read the Spotify IDs to check
    ids_param = request.args.get('ids', '')
    spotify_ids = [i.strip() for i in ids_param.split(',') if i.strip()]
    if not spotify_ids:
        return jsonify({'error': 'no_ids_provided'}), 400
    if len(spotify_ids) > 50:
        return jsonify({'error': 'max_50_ids_allowed'}), 400

    headers = {'Authorization': f'Bearer {token}'}

    # 3) Check who we follow
    resp = requests.get(
        'https://api.spotify.com/v1/me/following/contains',
        headers=headers,
        params={'type': 'user', 'ids': ','.join(spotify_ids)}
    )
    resp.raise_for_status()
    follows = resp.json()  # e.g. [false, true, true, false]

    # 4) For each followed user, fetch full profile
    friends = []
    for sp_id, is_followed in zip(spotify_ids, follows):
        if not is_followed:
            continue
        profile_resp = requests.get(
            f'https://api.spotify.com/v1/users/{sp_id}',
            headers=headers
        )
        profile_resp.raise_for_status()
        friends.append(profile_resp.json())

    # 5) Return the raw Spotify JSON profiles
    return jsonify(friends)

@app.route('/')
def index():
    return 'Welcome to the Song Recommendation API!'

    

# Define a route to get user recommendations
@app.route('/recommend/user/<int:user_id>', methods=['GET'])
def get_user_recommendations(user_id):
    conn = get_db_connection()  # Establish a database connection
    # Execute a SQL query to retrieve song details for the given user_id
    recommendations = conn.execute('''
                                SELECT songs.song_id, songs.title, artists.name AS artist, songs.year, songs.play_count, r.user_id AS recommended_by
                                FROM recommendations r
                                JOIN recommendationSong rs ON r.id = rs.recommendationId
                                JOIN songs ON rs.song_id = songs.song_id
                                JOIN artists ON songs.artist_id = artists.artist_id
                                WHERE r.friend_id = ?
                            ''', (user_id,)).fetchall()
    conn.close()  # Close the database connection
    # Convert the result to a list of dictionaries and return as JSON
    return jsonify([dict(song) for song in recommendations])

# Define a route to get songs
@app.route('/songs', methods=['GET'])
def get_songs():
    conn = get_db_connection()  # Establish a database connection
    # Execute a SQL query to retrieve song details along with artist names
    songs = conn.execute('''
                         SELECT songs.song_id, songs.title, artists.name AS artist, songs.year, songs.play_count 
                         FROM songs
                         JOIN artists ON songs.artist_id = artists.artist_id
                         ''').fetchall()
    conn.close()  # Close the database connection
    # Convert the result to a list of dictionaries and return as JSON
    return jsonify([dict(song) for song in songs])

@app.route('/recommend/artist/<int:song_id>', methods=['GET'])
def recommend_artist(song_id):
    conn = get_db_connection()  # Establish a database connection
    # Execute a SQL query to retrieve the artist_id of the song with the given song_id
    song = conn.execute('''
                        SELECT artists.genre
                        FROM songs
                        JOIN artists ON songs.artist_id = artists.artist_id
                        WHERE songs.song_id = ?
                        ''', (song_id,)).fetchone()
    if song is None:
        return jsonify({'error': 'Song not found'}), 404
    
    # Execute a SQL query to retrieve the song details of songs by the same genre 
    genre = song['genre']

    recommendations = conn.execute('''
                                    SELECT songs.song_id, songs.title, artists.name as artist, songs.play_count, artists.genre
                                    FROM songs
                                    JOIN artists ON songs.artist_id = artists.artist_id
                                    WHERE artists.genre = ? AND songs.song_id != ?
                                    ''', (genre,song_id)).fetchall()
    conn.close()
    return jsonify([dict(song) for song in recommendations])

@app.route('/recommend', methods=['PUT'])
def recommend_song():
    data = request.get_json()

    user_id = data.get('user_id')
    friend_id = data.get('friend_id')
    song_id = data.get('song_id')

    if not all([user_id, friend_id, song_id]):
        return jsonify({'error': 'Missing user_id, friend_id or song_id'}), 400
    
    if user_id == friend_id:
        return jsonify({'error': 'Cannot recommend a song to yourself'}), 400

    conn = get_db_connection()

    # Check if user and friend exist
    user = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone() 
    friend = conn.execute('SELECT * FROM users WHERE user_id = ?', (friend_id,)).fetchone()
    song = conn.execute('SELECT * FROM songs WHERE song_id = ?', (song_id,)).fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'Recommending user does not exist'}), 404
    if not friend:
        conn.close()
        return jsonify({'error': 'Friend user does not exist'}), 404
    if not song:
        conn.close()
        return jsonify({'error': 'Song does not exist'}), 404

    # Check if recommendation already exists
    existing = conn.execute('''
        SELECT *
        FROM recommendations r
        JOIN recommendationSong rs ON r.id = rs.recommendationId
        WHERE r.user_id = ? AND r.friend_id = ? AND rs.song_id = ?
    ''', (user_id, friend_id, song_id)).fetchone()

    if existing:
        conn.close()
        return jsonify({'message': 'Song has already been recommended to this user'}), 200

    # Insert new recommendation
    conn.execute('INSERT INTO recommendations (user_id, friend_id) VALUES (?, ?)', (user_id, friend_id))
    recommendation_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.execute('INSERT INTO recommendationSong (recommendationId, song_id) VALUES (?, ?)', (recommendation_id, song_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Song successfully recommended!'}), 201
    
if __name__ == '__main__':
    app.run(debug=True)