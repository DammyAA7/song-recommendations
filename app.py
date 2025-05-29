from flask import Flask, jsonify, request, session
import requests
from flask_session import Session
from flask_cors import CORS
from urllib.parse import urlencode
import psycopg2
from psycopg2.extras import DictCursor
import os, secrets
import time
from datetime import timedelta, datetime
from functools import wraps
from itertools import islice


# Initialize the Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET_KEY", 'dev-key-change-in-production')

# ---------------- Session Configuration ----------------

app.config.update(
    # Session configuration
    SESSION_TYPE='filesystem',
    SESSION_PERMANENT=True,
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
    
    # Cookie configuration
    SESSION_COOKIE_NAME='songrec_session',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,  # Only for HTTPS
    SESSION_COOKIE_SAMESITE='None',  # Changed from 'None' to 'Lax'
    
    # Add these important settings
    SESSION_USE_SIGNER=True,
    SESSION_KEY_PREFIX='songrec:',
    SESSION_FILE_DIR='/tmp/flask_session',  # Ensure this directory exists and is writable
    SESSION_FILE_THRESHOLD=500,
    SESSION_FILE_MODE=384,  # 0o600 in octal
)

Session(app)

CORS(app, 
     origins=["https://open.spotify.com", "chrome-extension://ijageeaiiaemphkdojoopbmphopjoipk", "https://recspot-e6585868d70b.herokuapp.com"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS", "DELETE"])

# Function to establish a connection to the Postgres database
def get_db_connection():
    
    # Get database URL from environment variable
    database_url = os.environ.get("DATABASE_URL")
    
    if not database_url:
        # Fallback for local development (optional)
        database_url = "postgresql://postgres:your_local_password@localhost:5432/your_local_db"
    
    conn = psycopg2.connect(database_url)
    conn.cursor_factory = DictCursor
    return conn

# Yield chunks of a specified size from an iterable
def chunked(iterable, size):
    it = iter(iterable)
    return iter(lambda: list(islice(it, size)), [])

def refresh_access_token():
    refresh_token = session.get('refresh_token')
    # If refresh token is not in session, we fetch it from the database
    if not refresh_token:
        conn = get_db_connection()
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id_not_found'}), 401
        # Fetch the refresh token from the database
        row = conn.execute("""
            SELECT refresh_token FROM users WHERE spotify_user_id = %s
        """, (user_id,)).fetchone()
        conn.close()
        if not row:
            return jsonify({'error': 'refresh_token_not_found'}), 401
        refresh_token = row['refresh_token']
    auth_header = requests.auth.HTTPBasicAuth(
        os.getenv("SPOTIFY_CLIENT_ID"),
        os.getenv("SPOTIFY_CLIENT_SECRET")
    )
    resp = requests.post(
        'https://accounts.spotify.com/api/token',
        data={
            'grant_type':    'refresh_token',
            'refresh_token': refresh_token
        },
        auth=auth_header
    )
    resp.raise_for_status()
    tokens = resp.json()
    # tokens contains: access_token, token_type, scope, expires_in
    session['access_token'] = tokens['access_token']
    session['expires_at']   = time.time() + tokens['expires_in']
    if 'refresh_token' in tokens:
        # Spotify may return a new refresh token, so we update it
        session['refresh_token'] = tokens['refresh_token']

    conn = get_db_connection()
    # Update the access token in the database
    conn.execute("""
        UPDATE users
        SET access_token = %s, refresh_token = %s, token_expiry = %s
        WHERE spotify_user_id = %s
    """, (session['access_token'], session['refresh_token'], session['expires_at'], session.get('user_id')))
    conn.commit()
    conn.close()
    return session['access_token']

def ensure_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # if token expired or missing, refresh it
        if 'access_token' not in session or time.time() >= session.get('expires_at', 0):
            refresh_access_token()
        return f(*args, **kwargs)
    return decorated

# Define a route for the root URL
@app.route('/login')
def login():
    # Generate new state and store it in database instead of session
    state = secrets.token_urlsafe(16)
    
    # Store state in database with expiration
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Clean up expired states first
        cursor.execute("""
            DELETE FROM oauth_states 
            WHERE created_at < NOW() - INTERVAL '5 minutes'
        """)
        
        # Insert new state
        cursor.execute("""
            INSERT INTO oauth_states (state, created_at) 
            VALUES (%s, NOW())
        """, (state,))
        
        conn.commit()
        print(f"Generated and stored state in DB: {state}")
        
    except Exception as e:
        conn.rollback()
        print(f"Database error in login: {e}")
        return jsonify({'error': 'Database error during login'}), 500
    
    finally:
        cursor.close()
        conn.close()
    
    scope = "user-follow-read user-read-email user-modify-playback-state user-read-playback-state"
    params = {
        "client_id": os.environ.get("SPOTIFY_CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": os.environ.get("SPOTIFY_REDIRECT_URI"),
        "scope": scope,
        "state": state,
        "show_dialog": "true"
    }
    auth_url = "https://accounts.spotify.com/authorize?" + urlencode(params)
    print(f"Auth URL: {auth_url}")
    
    return jsonify({
        'status': 'success',
        'auth_url': auth_url,
        'message': 'Authorization URL generated',
        'state': state
    }), 200

@app.route('/check_auth')
@ensure_token  # Ensure the access token is valid before proceeding
def check_auth():
    
    try:
        if 'access_token' in session:
            # Check if token is expired
            if session.get('expires_at', 0) <= time.time():
                # Token expired, clear session
                session.clear()
                print({'authenticated': False, 'reason': 'token_expired'})
                return jsonify({'authenticated': False, 'reason': 'token_expired'}), 401
            
            return jsonify({
                'authenticated': True, 
                'user_id': session.get('user_id'),
                'expires_at': session.get('expires_at')
            }), 200
        else:
            print({'authenticated': False, 'reason': 'no_token'})
            return jsonify({'authenticated': False, 'reason': 'no_token'}), 401
            
    except Exception as e:
        print(f"Check auth error: {e}")
        return jsonify({'authenticated': False, 'error': str(e)}), 500

@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')

    print(f"Callback received - Code: {'Present' if code else 'Missing'}")
    print(f"State from callback: {state}")
    
    if error:
        return jsonify({'error': f'Authorization failed: {error}'}), 400
    if not code:
        return jsonify({'error': 'Authorization code not found'}), 400
    if not state:
        return jsonify({'error': 'State parameter missing'}), 400
    
    # Check state against database instead of session
    # Check state against database instead of session
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Clean up expired states
        cursor.execute("""
            DELETE FROM oauth_states 
            WHERE created_at < NOW() - INTERVAL '10 minutes'
        """)
        
        # Check if state exists and is valid
        cursor.execute("""
            SELECT state FROM oauth_states 
            WHERE state = %s AND created_at > NOW() - INTERVAL '10 minutes'
        """, (state,))
        
        stored_state_row = cursor.fetchone()
        
        if not stored_state_row:
            return jsonify({
                'error': 'Invalid or expired state',
                'received_state': state,
                'message': 'State not found in database or has expired'
            }), 400
        
        # State is valid, remove it from database (single use)
        cursor.execute("DELETE FROM oauth_states WHERE state = %s", (state,))
        conn.commit()
        
        print(f"State validated successfully: {state}")
        
    except Exception as e:
        conn.rollback()
        print(f"Database error during state validation: {e}")
        return jsonify({'error': 'Database error during authentication'}), 500
    
    finally:
        cursor.close()
        conn.close()
    
    print(f"State validated successfully: {state}")
    
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
    }

    auth_header = requests.auth.HTTPBasicAuth(
        os.getenv("SPOTIFY_CLIENT_ID"),
        os.getenv("SPOTIFY_CLIENT_SECRET")
    )

    try:
        resp = requests.post(
            "https://accounts.spotify.com/api/token",
            data=token_data,
            auth=auth_header
        )
        resp.raise_for_status()
        tokens = resp.json()

        print(f"Received tokens: {list(tokens.keys())}")

        # Make session permanent to ensure it persists
        session.permanent = True
        
        # Store tokens in session
        session['access_token'] = tokens['access_token']
        session['refresh_token'] = tokens['refresh_token']
        session['expires_in'] = tokens['expires_in']
        session['expires_at'] = time.time() + tokens['expires_in']
        
        profile_resp = requests.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        
        if profile_resp.status_code == 200:
            profile = profile_resp.json()
            session['user_id'] = profile['id']  # Store the user ID in the session
            
            print(f"Session after user_id storage: {dict(session)}")

            # Store user in database
            conn = get_db_connection()
            cursor = conn.cursor()

            try:
                expires_at_datetime = datetime.fromtimestamp(session['expires_at'])
                cursor.execute("""
                INSERT INTO users (
                    spotify_user_id,
                    spotify_display_name,
                    spotify_email,
                    spotify_avatar_url,
                    access_token,
                    refresh_token,
                    token_expiry
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT(spotify_user_id) DO UPDATE SET
                    spotify_display_name = EXCLUDED.spotify_display_name,
                    spotify_email        = EXCLUDED.spotify_email,
                    spotify_avatar_url   = EXCLUDED.spotify_avatar_url,
                    access_token         = EXCLUDED.access_token,
                    refresh_token        = EXCLUDED.refresh_token,
                    token_expiry         = EXCLUDED.token_expiry
                """, (
                    profile['id'],
                    profile.get('display_name'),
                    profile.get('email'),
                    (profile.get('images') or [{}])[0].get('url'),
                    tokens['access_token'],
                    tokens['refresh_token'],
                    expires_at_datetime
                ))
                conn.commit()
                print(f"User profile stored: {profile['id']}")
                
            except Exception as e:
                conn.rollback()
                print(f"Database error storing user: {e}")
                return jsonify({'error': 'Failed to store user data'}), 500
            
            finally:
                cursor.close()
                conn.close()
            
            print(f"User profile stored: {profile['id']}")
        else:
            print(f"Failed to fetch user profile: {profile_resp}")
            return jsonify({'error': 'Failed to fetch user profile'}), 400

        # Clear any oauth state from session after successful authentication
        session.pop('oauth_state', None)
        session.pop('state_created_at', None)
        
        print("Authentication successful, tokens stored in session")
        
    except requests.RequestException as e:
        print(f"Token exchange failed: {e}")
        return jsonify({'error': 'Failed to exchange code for tokens'}), 400

    return '''
        <html>
        <head><title>Authentication Successful</title></head>
        <body>
            <script>
                // Try to close popup/iframe or redirect parent
                if (window.opener) {
                    window.opener.postMessage('auth_success', '*');
                    window.close();
                } else if (window.parent !== window) {
                    window.parent.postMessage('auth_success', '*');
                } else {
                    document.body.innerHTML = '<h2>Authentication successful! You can close this tab.</h2>';
                }
            </script>
            <h2>Authentication successful!</h2>
            <p>You can close this window.</p>
        </body>
        </html>
        '''

@app.route('/me')
@ensure_token  # Ensure the access token is valid before proceeding
def me():
    access_token = session.get('access_token')
    if not access_token:
        return jsonify({'error': 'Access token not found'}), 401
    profile = requests.get(
        "https://api.spotify.com/v1/me",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()
    if 'error' in profile:
        return jsonify({'error': 'spotify_api_error', 'details': profile}), 400
    session['user_id'] = profile['id']  # Store the user ID in the session
        
    return jsonify(profile)
@app.route('/logout')
def logout():
    # Clear the session data
    user_id = session.get('user_id')
    access_token = session.get('access_token')
    print(f"Logging out user_id: {user_id}, access_token: {'Present' if access_token else 'Missing'}")
    if user_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE users
                SET
                    access_token = NULL,
                    refresh_token = NULL,
                    token_expiry = NULL
                WHERE spotify_user_id = %s
            """, (user_id,))
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            print(f"Error during logout database update: {e}")
            # Don't return error here as we still want to clear the session
            
        finally:
            cursor.close()
            conn.close()
    
    # Clear session but preserve the session object itself
    session.clear()
    
    # Ensure session is properly configured for future use
    session.permanent = True
    
    print("Session cleared successfully")
    return jsonify({'message': 'Logged out successfully', 'user_id': user_id}), 200


@app.route('/following', methods=['GET'])
@ensure_token  # Ensure the access token is valid before proceeding
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
@ensure_token  # Ensure the access token is valid before proceeding
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
    cursor = conn.cursor()
    try:
        # Check if user is already a friend
        cursor.execute("""
            SELECT 1 FROM friends WHERE user_id = %s AND friend_id = %s
        """, (user_id, friend_id))
        friend_exists1 = cursor.fetchone()
        
        cursor.execute("""
            SELECT 1 FROM friends WHERE user_id = %s AND friend_id = %s
        """, (friend_id, user_id))
        friend_exists2 = cursor.fetchone()
        
        if friend_exists1 or friend_exists2:
            return jsonify({'error': 'friend_already_exists'}), 400
        
        # Insert or update the user in the database
        cursor.execute("""
            INSERT INTO users (
                spotify_user_id,
                spotify_display_name,
                spotify_avatar_url
            ) VALUES (%s, %s, %s) ON CONFLICT(spotify_user_id) DO UPDATE SET
                spotify_display_name = EXCLUDED.spotify_display_name,
                spotify_avatar_url   = EXCLUDED.spotify_avatar_url
        """, (
            profile['id'],
            profile.get('display_name'),
            (profile.get('images') or [{}])[0].get('url')
        ))

        # Create a new entry in the friends table (bidirectional relationship)
        cursor.execute("""
            INSERT INTO friends (user_id, friend_id) VALUES (%s, %s)
        """, (user_id, friend_id))
        
        cursor.execute("""
            INSERT INTO friends (user_id, friend_id) VALUES (%s, %s)
        """, (friend_id, user_id))
        
        conn.commit()
        
        return jsonify({
            'message': 'friend_added',
            'friend': {
                'user_id': user_id,
                'spotify_user_id': profile['id'],
                'display_name': profile.get('display_name'),
                'avatar_url': (profile.get('images') or [{}])[0].get('url')
            }
        }), 201
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding friend: {e}")
        return jsonify({'error': 'database_error'}), 500
        
    finally:
        cursor.close()
        conn.close()

@app.route('/list_friends', methods=['GET'])
@ensure_token  # Ensure the access token is valid before proceeding
def list_friends():
    access_token = session.get('access_token')
    user_id = session.get('user_id')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    if not user_id:
        return jsonify({'error': 'user_id_not_found'}), 401
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Retrieve friends from the database
        cursor.execute('''
            SELECT u.spotify_user_id, u.spotify_display_name, u.spotify_avatar_url
            FROM friends f
            JOIN users u ON f.friend_id = u.spotify_user_id
            WHERE f.user_id = %s
        ''', (user_id,))
        friends = cursor.fetchall()
        
        # Convert the result to a list of dictionaries
        friends_list = [{
            'spotify_user_id': friend['spotify_user_id'],
            'display_name': friend['spotify_display_name'],
            'avatar_url': friend['spotify_avatar_url']
        } for friend in friends]
        
        return jsonify(friends_list)
        
    except Exception as e:
        # Log the error (you might want to use proper logging here)
        print(f"Error retrieving friends list: {e}")
        return jsonify({'error': 'database_error'}), 500
        
    finally:
        cursor.close()
        conn.close()

@app.route('/')
def index():
    return 'Welcome to the Song Recommendation API!'

# Define a route to get user recommendations
@app.route('/recommendations', methods=['GET'])
@ensure_token
def get_user_recommendations():
    access_token = session.get('access_token')
    user_id      = session.get('user_id')
    if not access_token or not user_id:
        return jsonify({'error': 'not_authenticated'}), 401

    # 1) Single DB query to get everything we need
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1) Single DB query to get everything we need
        cursor.execute("""
            SELECT
                rs.song_id,
                rs.recommendation_id,
                rs.like_dislike,
                r.user_id          AS recommended_by,
                u.spotify_display_name AS friend_name,
                u.spotify_avatar_url   AS friend_avatar
            FROM recommendations r
            JOIN recommendation_songs rs
              ON rs.recommendation_id = r.id
            JOIN users u
              ON u.spotify_user_id   = r.user_id
            WHERE r.friend_id = %s
            ORDER BY r.created_at DESC
        """, (user_id,))
        rows = cursor.fetchall()
        
    except Exception as e:
        print(f"Error fetching recommendations: {e}")
        return jsonify({'error': 'database_error'}), 500
        
    finally:
        cursor.close()
        conn.close()

    # 2) Batch‐fetch all Spotify tracks
    headers = {'Authorization': f'Bearer {access_token}'}
    all_ids = [row['song_id'] for row in rows]
    track_map = {}
    try:
        for batch in chunked(all_ids, 50):
            resp = requests.get(
                'https://api.spotify.com/v1/tracks',
                params={'ids': ','.join(batch)},
                headers=headers
            )
            resp.raise_for_status()
            for track in resp.json()['tracks']:
                if track:  # Spotify may return null for deleted tracks
                    track_map[track['id']] = track
    except requests.RequestException as e:
        print(f"Error fetching Spotify tracks: {e}")
        return jsonify({'error': 'spotify_api_error'}), 500

    # 3) Build the response
    output = []
    for row in rows:
        tid = row['song_id']
        track = track_map.get(tid)
        if not track:
            output.append({'error': 'spotify_api_error', 'song_id': tid})
            continue

        output.append({
            'song_id'          : tid,
            'title'            : track['name'],
            'artist'           : ', '.join(a['name'] for a in track['artists']),
            'album'            : track['album']['name'],
            'track_cover'      : (track['album']['images'][0]['url']
                                  if track['album']['images'] else None),
            'year'             : track['album']['release_date'][:4],
            'recommendation_id': row['recommendation_id'],
            'recommended_by'   : row['recommended_by'],
            'friend_name'      : row['friend_name'],
            'friend_avatar'    : row['friend_avatar'],
            'like_dislike'     : row['like_dislike']  # 1 = like, 0 = dislike, None = pending
        })

    return jsonify(output)

@app.route('/sent_recommendations', methods=['GET'])
@ensure_token
def get_sent_recommendations():
    access_token = session.get('access_token')
    user_id      = session.get('user_id')
    if not access_token or not user_id:
        return jsonify({'error': 'not_authenticated'}), 401

    # 1) Single DB query
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1) Single DB query
        cursor.execute("""
            SELECT
              rs.song_id,
              rs.recommendation_id,
              rs.like_dislike,
              r.friend_id           AS recommended_to,
              u.spotify_display_name AS friend_name,
              u.spotify_avatar_url   AS friend_avatar
            FROM recommendations      r
            JOIN recommendation_songs  rs ON rs.recommendation_id = r.id
            JOIN users                u  ON u.spotify_user_id   = r.friend_id
            WHERE r.user_id = %s
            ORDER BY r.created_at DESC
        """, (user_id,))
        rows = cursor.fetchall()
        
    except Exception as e:
        print(f"Error fetching sent recommendations: {e}")
        return jsonify({'error': 'database_error'}), 500
        
    finally:
        cursor.close()
        conn.close()

    # 2) Batch-fetch tracks
    headers = {'Authorization': f'Bearer {access_token}'}
    track_ids = [row['song_id'] for row in rows]
    track_map = {}
    try:
        for batch in chunked(track_ids, 50):
            resp = requests.get(
                'https://api.spotify.com/v1/tracks',
                params={'ids': ','.join(batch)},
                headers=headers
            )
            resp.raise_for_status()
            for t in resp.json()['tracks']:
                if t:  # Spotify may return null for deleted tracks
                    track_map[t['id']] = t
    except requests.RequestException as e:
        print(f"Error fetching Spotify tracks: {e}")
        return jsonify({'error': 'spotify_api_error'}), 500

    # 3) Build response
    out = []
    for row in rows:
        tid = row['song_id']
        track = track_map.get(tid)
        if not track:
            out.append({'error': 'spotify_api_error', 'song_id': tid})
            continue

        out.append({
            'song_id'           : tid,
            'title'             : track['name'],
            'artist'            : ', '.join(a['name'] for a in track['artists']),
            'track_cover'       : (track['album']['images'][0]['url']
                                   if track['album']['images'] else None),
            'recommendation_id' : row['recommendation_id'],
            'recommended_to'    : row['recommended_to'],
            'friend_name'       : row['friend_name'],
            'friend_avatar'     : row['friend_avatar'],
            'like_dislike'      : row['like_dislike']   # 1 = like, 0 = dislike, None = pending
        })
    return jsonify(out)

@app.route('/recommend', methods=['POST'])
@ensure_token  # Ensure the access token is valid before proceeding
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
    
    song_id = request.json.get('song_id')
    if not song_id:
        return jsonify({'error': 'song_id_required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if user is friends with the friend_id
        cursor.execute("""
            SELECT EXISTS(
                SELECT 1 FROM friends
                WHERE (user_id = %s AND friend_id = %s)
                    OR (user_id = %s AND friend_id = %s)
            )
        """, (user_id, friend_id, friend_id, user_id))
        
        if not cursor.fetchone()[0]:
            return jsonify({'error': 'Not_Friends_with_user'}), 400

        # Check if recommendation already exists
        cursor.execute('''
            SELECT EXISTS(
                SELECT 1
                FROM recommendations r
                JOIN recommendation_songs rs ON r.id = rs.recommendation_id
                WHERE r.user_id = %s AND r.friend_id = %s AND rs.song_id = %s
            )
        ''', (user_id, friend_id, song_id))
        
        if cursor.fetchone()[0]:
            return jsonify({'error': 'Song has already been recommended to this user'}), 400

        # Insert new recommendation
        cursor.execute('INSERT INTO recommendations (user_id, friend_id) VALUES (%s, %s)', (user_id, friend_id))
        cursor.execute('SELECT lastval()')
        recommendation_id = cursor.fetchone()[0]
        cursor.execute('INSERT INTO recommendation_songs (recommendation_id, song_id) VALUES (%s, %s)', (recommendation_id, song_id))
        
        conn.commit()
        
        return jsonify({
            'message': 'Song successfully recommended!',
            'Song Details': {
                'song_id': song_id,
            },
            'recommended_by': user_id,
            'recommended_to': friend_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        print(f"Error recommending song: {e}")
        return jsonify({'error': 'database_error'}), 500
        
    finally:
        cursor.close()
        conn.close()

@app.route('/like_recommendation', methods=['POST'])
@ensure_token  # Ensure the access token is valid before proceeding
def like_recommendation():
    access_token = session.get('access_token')
    user_id = session.get('user_id')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    if not user_id:
        return jsonify({'error': 'user_id_not_found'}), 401
    
    # Check if the request contains a recommendation_id
    rec_id = request.json.get('recommendation_id')
    song_id  = request.json.get('song_id')
    action   = request.json.get('action')  # 'like' or 'dislike'

    if not rec_id:
        return jsonify({'error': 'recommendation_id_required'}), 400
    if not song_id:
        return jsonify({'error': 'song_id_required'}), 400
    if action not in ('like', 'dislike', 'null'):
        return jsonify({'error': 'invalid_action', 'message': "action must be 'like' or 'dislike'"}), 400

    # Convert action to a value for the database
    if action == 'null':
        val = None
    else:
        val = True if action == 'like' else False

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 2) Verify that recommendation exists and belongs to this user
        cursor.execute('''
            SELECT 1
            FROM recommendations
            WHERE id = %s AND friend_id = %s
        ''', (rec_id, user_id))
        rec = cursor.fetchone()
        
        if not rec:
            return jsonify({'error': 'not_found', 'message': 'Recommendation not found or not yours'}), 404

        # 3) Verify that the song is part of that recommendation
        cursor.execute('''
            SELECT 1
            FROM recommendation_songs
            WHERE recommendation_id = %s AND song_id = %s
        ''', (rec_id, song_id))
        rs = cursor.fetchone()
        
        if not rs:
            return jsonify({'error': 'not_found', 'message': 'Song not in that recommendation'}), 404

        # 4) Update the like_dislike flag
        cursor.execute('''
            UPDATE recommendation_songs
            SET like_dislike = %s
            WHERE recommendation_id = %s AND song_id = %s
        ''', (val, rec_id, song_id))
        
        conn.commit()
        
        return jsonify({
            'message': 'Recommendation song updated',
            'recommendation_id': rec_id,
            'song_id': song_id,
            'action': action
        }), 200
        
    except Exception as e:
        conn.rollback()
        # Log the error for debugging
        print(f"Error in like_recommendation: {e}")
        return jsonify({'error': 'database_error', 'message': 'An error occurred while processing your request'}), 500
        
    finally:
        cursor.close()
        conn.close()


@app.route('/get_song_id', methods=['POST'])
@ensure_token  # Ensure the access token is valid before proceeding
def get_song_id():
    access_token = session.get('access_token')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    
    album_id = request.json.get('album_id')
    if not album_id:
        return jsonify({'error': 'album_id_required'}), 400
    
    track_name = request.json.get('track_name')
    if not track_name:
        return jsonify({'error': 'track_name_required'}), 400
    # Fetch the album details from Spotify
    album_resp = requests.get(
        f'https://api.spotify.com/v1/albums/{album_id}',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    if album_resp.status_code != 200:
        return jsonify({'error': 'spotify_api_error', 'details': album_resp.json()}), album_resp.status_code
    album = album_resp.json()
    # Find the track in the album   
    for track in album.get('tracks', {}).get('items', []):
        if track['name'].lower() == track_name.lower():
            return jsonify({
                'song_id': track['id'],
                'title': track['name'],
                'artist': ', '.join(artist['name'] for artist in track['artists']),
                'track_cover': album['images'][0]['url'] if album['images'] else None,
                'album': album['name'],
                'year': album['release_date'][:4]
            }), 200
    return jsonify({'error': 'track_not_found_in_album'}), 404

@app.route('/play_song', methods=['POST'])
@ensure_token  # Ensure the access token is valid before proceeding
def play_song():
    access_token = session.get('access_token')
    if not access_token:
        return jsonify({'error': 'not_authenticated'}), 401
    
    song_id = request.json.get('song_id')
    if not song_id:
        return jsonify({'error': 'song_id_required'}), 400
    
    device_id = get_chrome_id(access_token)
    if not device_id:
        return jsonify({'error': 'no_active_device_found'}), 404
    print("Device ID:", device_id)
    # Use the Spotify Web API to play the song
    resp = requests.put(
        'https://api.spotify.com/v1/me/player/play?device_id=' + device_id,
        headers={'Authorization': f'Bearer {access_token}'},
        json={
            'uris': [f'spotify:track:{song_id}']
        }
    )
    if resp.status_code == 204:
        return jsonify({'message': 'Song is now playing', 'chrome_device_id': device_id}), 200
    else:
        return jsonify({'error': 'spotify_api_error', 'details': resp.json()}), resp.status_code


def get_chrome_id(access_token):
    resp = requests.get(
        'https://api.spotify.com/v1/me/player/devices',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    if resp.status_code != 200:
        return []
    devices = resp.json().get('devices', [])
    # Look for “Web Player (Chrome)” or any name containing “Chrome”
    for d in devices:
        name = d.get('name', '')
        if 'Chrome' in name:
            return d['id']
    # Fallback: no Chrome device found
    return None

@app.route('/debug_session')
def debug_session():
    return jsonify({
        'oauth_state_in_session': session.get('oauth_state'),
        'state_created_at': session.get('state_created_at'),
        'has_access_token': 'access_token' in session,
        'has_user_id': 'user_id' in session,
        'user_id': session.get('user_id'),
        'expires_at': session.get('expires_at'),
        'session_keys': list(session.keys()),
        'session_permanent': session.permanent
    })
    
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)