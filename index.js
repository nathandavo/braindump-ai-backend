const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY;
let cache = null;
let last = 0;

app.get('/players', async (req, res) => {
  // Serve cached data if less than 24h old
  if (cache && Date.now() - last < 86400000) return res.json(cache);

  try {
    let allPlayers = {};
    const league = 39; // Premier League
    const seasons = Array.from({ length: 18 }, (_, i) => 2024 - i); // last 18 seasons (2006-2024)

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
          const goals = p.statistics[0]?.goals?.total || 0;

          if (!allPlayers[id]) {
            allPlayers[id] = {
              id,
              name: p.player.name,
              photo: p.player.photo,
              goals: 0
            };
          }

          allPlayers[id].goals += goals;
        }

        // Stop if last page
        if (players.length < 20) break;
        page++;
      }
    }

    cache = Object.values(allPlayers).filter(p => p.goals > 0);
    last = Date.now();

    res.json(cache);

  } catch (e) {
    console.log("API ERROR:", e.response?.data || e.message);
    res.status(500).json({ error: 'API failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API ready'));
