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
    
if __name__ == '__main__':
    app.run(debug=True)