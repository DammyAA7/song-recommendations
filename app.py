from flask import Flask, jsonify, request
import sqlite3

# Initialize the Flask application
app = Flask(__name__)

# Function to establish a connection to the SQLite database
def get_db_connection():
    conn = sqlite3.connect('catalog.db')
    conn.row_factory = sqlite3.Row  # This allows us to access columns by name
    return conn

# Define a route for the root URL
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