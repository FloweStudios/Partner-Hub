// api/config.js
// Serves the Google OAuth client ID to the frontend.
// Kept here so it never appears in any committed file.

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not set in environment variables.' });
  }

  res.status(200).json({ clientId });
}
