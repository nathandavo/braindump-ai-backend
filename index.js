const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY;
let cache = null;
let last = 0;

// GET players with summed stats across multiple seasons
app.get('/players', async (req, res) => {
  if (cache && Date.now() - last < 86400000) return res.json(cache); // 24h cache

  try {
    const league = 39; // Premier League
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2010, 2009]; // adjust as needed
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
          const goals = p.statistics[0]?.goals?.total || 0;

          if (!allPlayers[id]) {
            allPlayers[id] = {
              id,
              name: p.player.name,
              photo: p.player.photo,
              appearances: 0,
              goals: 0
            };
          }

          allPlayers[id].appearances += appearances;
          allPlayers[id].goals += goals;
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
