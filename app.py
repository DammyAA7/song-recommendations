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
        "state": state,
        "show_dialog":  "true"
    }
    auth_url = "https://accounts.spotify.com/authorize?" + urlencode(params)
    print(auth_url)
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
        'type': 'artist',
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
    if not user_id:
        return jsonify({'error': 'user_id_not_found'}), 401
   
    # Check if the request contains a friend_id
    friend_id = request.json.get('friend_id')
    if not friend_id:
        return jsonify({'error': 'friend_id_required'}), 400
    if user_id == friend_id:
        return jsonify({'error': 'cannot_add_yourself'}), 400

    # Check if user follows the friend
    # Spotify API does not support API for listing friends friends, but we can check if the user follows them
    # In reality, this is a workaround to simulate "friends" by checking if the user follows another user
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
    
    # If the user follows the friend, we can add them to our friends list
    # If user does not exist in the database, we create a new entry
    profile_resp = requests.get(
        'https://api.spotify.com/v1/users/' + friend_id,
        headers={'Authorization': f'Bearer {access_token}'}
    )
    # Check if the profile request was successful
    profile = profile_resp.json()
    if profile_resp.status_code != 200:
        return jsonify({'error': 'spotify_api_error', 'details': profile}), profile_resp.status_code
    
    conn = get_db_connection()
    # Check if user is already a friend
    if conn.execute("""
                    SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
                    """,
                    (user_id, friend_id)).fetchone() or conn.execute("""
                    SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
                    """,
                    (friend_id, user_id)).fetchone():
        conn.close()
        return jsonify({'error': 'friend_already_exists'}), 400
    
    # Insert or update the user in the database
    conn.execute("""
    INSERT INTO users (
                spotify_user_id,
        spotify_display_name,
        spotify_avatar_url
                 ) VALUES (?, ?, ?) ON CONFLICT(spotify_user_id) DO UPDATE SET
        spotify_display_name = excluded.spotify_display_name,
        spotify_avatar_url   = excluded.spotify_avatar_url
    """, (
        profile['id'],
        profile.get('display_name'),
        (profile.get('images') or [{}])[0].get('url')
    ))

    # Create a new entry in the friends table
    conn.execute("""
    INSERT INTO friends (user_id, friend_id) VALUES (?, ?)
                 """, (user_id, friend_id))
    
    conn.execute("""
    INSERT INTO friends (user_id, friend_id) VALUES (?, ?)
                 """, (friend_id, user_id))
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'friend_added',
        'friend': {
            'user_id': user_id,
            'spotify_user_id': profile['id'],
            'display_name': profile.get('display_name'),
            'avatar_url': (profile.get('images') or [{}])[0].get('url')
            }
    }), 201

@app.route('/list_friends', methods=['GET'])
def list_friends():
    access_token = session.get('access_token')
    user_id = session.get('user_id')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    if not user_id:
        return jsonify({'error': 'user_id_not_found'}), 401
    conn = get_db_connection()
    # Retrieve friends from the database
    friends = conn.execute('''
                        SELECT u.spotify_user_id, u.spotify_display_name, u.spotify_avatar_url
                        FROM friends f
                        JOIN users u ON f.friend_id = u.spotify_user_id
                        WHERE f.user_id = ?
                        ''', (user_id,)).fetchall()
    conn.close()
    # Convert the result to a list of dictionaries and return as JSON
    return jsonify([{
        'spotify_user_id': friend['spotify_user_id'],
        'display_name': friend['spotify_display_name'],
        'avatar_url': friend['spotify_avatar_url']
    } for friend in friends])

@app.route('/')
def index():
    return 'Welcome to the Song Recommendation API!'

    
# Define a route to get user recommendations
@app.route('/recommend/user/<int:user_id>', methods=['GET'])
def get_user_recommendations():
    access_token = session.get('access_token')
    user_id      = session.get('user_id')
    if not access_token or not user_id:
        return jsonify({'error': 'not_authenticated'}), 401
    
    conn = get_db_connection()  # Establish a database connection
    # Execute a SQL query to retrieve song details for the given user_id
    recommendations = conn.execute('''
                                SELECT songs.song_id, songs.title, artists.name AS artist, songs.year, songs.play_count, r.user_id AS recommended_by
                                FROM recommendations r
                                JOIN recommendationSongs rs ON r.id = rs.recommendation_id
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


@app.route('/recommend', methods=['POST'])
def recommend_song():
    access_token = session.get('access_token')
    user_id = session.get('user_id')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    if not user_id:
        return jsonify({'error': 'user_id_not_found'}), 401
    
    # Check if the request contains a friend_id
    friend_id = request.json.get('friend_id')
    if not friend_id:
        return jsonify({'error': 'friend_id_required'}), 400
    if user_id == friend_id:
        return jsonify({'error': 'cannot_recommend_to_yourself'}), 400
    
    conn = get_db_connection()

    # Check if user is friends with the friend_id
    if not conn.execute("""
                    SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
                    """,
                    (user_id, friend_id)).fetchone() and not conn.execute("""
                    SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
                    """,
                    (friend_id, user_id)).fetchone():
        conn.close()
        return jsonify({'error': 'Not_Friends_with_user'}), 400
    
    song_id = request.json.get('song_id')
    song_resp = requests.get(
        'https://api.spotify.com/v1/tracks/' + song_id,
        headers={'Authorization': f'Bearer {access_token}'}
    )
    song = song_resp.json()
    if song_resp.status_code != 200:
        return jsonify({'error': 'spotify_api_error', 'details': song}), song_resp.status_code

    # Check if recommendation already exists
    existing = conn.execute('''
        SELECT *
        FROM recommendations r
        JOIN recommendationSongs rs ON r.id = rs.recommendation_id
        WHERE r.user_id = ? AND r.friend_id = ? AND rs.song_id = ?
    ''', (user_id, friend_id, song_id)).fetchone()

    if existing:
        conn.close()
        return jsonify({'message': 'Song has already been recommended to this user'}), 200

    # Insert new recommendation
    conn.execute('INSERT INTO recommendations (user_id, friend_id) VALUES (?, ?)', (user_id, friend_id))
    recommendation_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.execute('INSERT INTO recommendationSongs (recommendation_id, song_id) VALUES (?, ?)', (recommendation_id, song_id))
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Song successfully recommended!',
        'Song Details': {
            'song_id': song['id'],
            'title': song['name'],
            'artist': ', '.join(artist['name'] for artist in song['artists']),
            'album': song['album']['name'],
            'year': song['album']['release_date'][:4]
        },
        'recommended_by': user_id,
        'recommended_to': friend_id
        }), 201
    
if __name__ == '__main__':
    app.run(debug=True)