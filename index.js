const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY; // <-- your API key
let cache = null;
let last = 0;

// GET all-time Premier League appearances across all seasons
app.get('/players', async (req, res) => {
  try {
    // Return cache if still valid (24h)
    if (cache && Date.now() - last < 86400000) return res.json(cache);

    const league = 39; // Premier League
    let allPlayers = {};

    // API-Football supports seasons typically from 2000+
    // Looping from 2025 down to 2000 to cover "all-time" in API coverage
    const seasons = Array.from({ length: 26 }, (_, i) => 2025 - i); // 2025 → 2000

    for (const season of seasons) {
      console.log(`Fetching season ${season}...`);
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

          // Accumulate appearances for all seasons
          allPlayers[id].appearances += appearances;
        }

        // Break if this is the last page
        if (players.length < 20) break;
        page++;
      }
    }

    // Convert object to array and filter players with >0 appearances
    cache = Object.values(allPlayers).filter(p => p.appearances > 0);
    last = Date.now();

    console.log(`Total players fetched: ${cache.length}`);
    res.json(cache);

  } catch (err) {
    console.log('API ERROR:', err.response?.data || err.message);
    res.status(500).json({ error: 'API failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API ready'));
