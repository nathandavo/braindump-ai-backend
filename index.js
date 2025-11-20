const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY; // your API key
let cache = null;
let last = 0;

// GET all-time Premier League appearances (2010-2025)
app.get('/players', async (req, res) => {
  if (cache && Date.now() - last < 86400000) return res.json(cache); // cache 24h

  try {
    const league = 39; // Premier League
    const seasons = Array.from({ length: 16 }, (_, i) => 2025 - i); // 2025 → 2010
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

          // Sum appearances across all teams in this season
          const appearances = p.statistics.reduce(
            (sum, s) => sum + (s.games.appearences || 0),
            0
          );

          if (!allPlayers[id]) {
            allPlayers[id] = { id, name: p.player.name, appearances: 0 };
          }

          allPlayers[id].appearances += appearances; // accumulate
        }

        if (players.length < 20) break; // last page
        page++;
      }
    }

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
