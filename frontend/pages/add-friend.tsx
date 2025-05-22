import { NextPage } from "next";
import {useState, ChangeEvent, FormEvent} from "react";

const AddFriend: NextPage = () => {
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 1) Handle input change
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setMessage(null)
    setError(null)
  }

  // 2) Extract the Spotify user ID from the pasted URL
  const extractId = (input: string): string | null => {
    try {
      // e.g. https://open.spotify.com/user/yvonnemongare?si=...
      const u = new URL(input.trim())
      const parts = u.pathname.split('/')
      const idx = parts.indexOf('user')
      if (idx >= 0 && parts.length > idx + 1) {
        return parts[idx + 1]
      }
    } catch {
      // invalid URL
    }
    return null
  }

  // 3) Submit handler
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    const friendId = extractId(url)
    console.log('Friend ID:', friendId)
    if (!friendId) {
      setError('Could not parse a Spotify user ID from that URL.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/add_friend', {
        method: 'POST',
        credentials: 'include',         // send the session cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: friendId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      setMessage(`✅ Friend added: ${data.friend.display_name || data.friend.spotify_user_id}`)
    } catch (err: any) {
      setError(`Error!!⚠️ ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl mb-4">Add a Spotify Friend</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Paste Spotify profile URL"
          value={url}
          onChange={onChange}
          className="w-full p-2 border rounded"
          disabled={loading}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Adding…' : 'Add Friend'}
        </button>
      </form>

      {message && <p className="mt-4 text-green-700">{message}</p>}
      {error   && <p className="mt-4 text-red-700">{error}</p>}
    </div>
  )
}

export default AddFriend