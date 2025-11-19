const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY;
let cache = null;
let last = 0;

// GET all-time Premier League players
app.get('/players', async (req, res) => {
  // Return cached data if <24h old
  if (cache && Date.now() - last < 86400000) return res.json(cache);

  try {
    const league = 39; // Premier League
    const seasons = Array.from({ length: 30 }, (_, i) => 2024 - i); // last 30 seasons
    let allPlayers = {};

    for (const season of seasons) {
      let page = 1;
      while (true) {
        const { data } = await axios.get('https://v3.football.api-sports.io/players', {
          params: { league, season, page },
          headers: { 'x-apisports-key': KEY }
        });

        const players = data.response;
        if (!players || players.length === 0) break;

        for (const p of players) {
          const id = p.player.id;
          const appearances = p.statistics[0]?.games?.appearences || 0;

          if (!allPlayers[id]) {
            allPlayers[id] = {
              id,
              name: p.player.name,
              photo: p.player.photo,
              appearances: 0
            };
          }

          allPlayers[id].appearances += appearances;
        }

        if (players.length < 20) break; // last page
        page++;
      }
    }

    // Convert object to array and filter players with 0 appearances
    cache = Object.values(allPlayers).filter(p => p.appearances > 0);
    last = Date.now();

    res.json(cache);

  } catch (e) {
    console.log('API ERROR:', e.response?.data || e.message);
    res.status(500).json({ error: 'API failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API ready'));
