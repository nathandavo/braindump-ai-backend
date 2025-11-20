const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY;

// Cache for 24 hours
let cache = null;
let last = 0;

app.get("/players", async (req, res) => {
  try {
    if (cache && Date.now() - last < 86400000) {
      return res.json(cache);
    }

    const league = 39; // Premier League

    // API-FOOTBALL only has complete appearances from 2014 onward
    const seasons = [
      2014, 2015, 2016, 2017, 2018,
      2019, 2020, 2021, 2022, 2023, 2024
    ];

    // Premier League teams (all PL teams 2014–2024)
    const teams = [
      33,34,35,36,37,38,39,40,41,42,
      45,46,47,48,49,50,51,52,55,57
    ];

    let players = {}; // { playerId: { id, name, appearances } }

    for (const season of seasons) {
      console.log(`Fetching season: ${season}`);

      for (const team of teams) {
        // Get the team squad
        const squadRes = await axios.get(
          "https://v3.football.api-sports.io/players/squads",
          {
            params: { team },
            headers: { "x-apisports-key": KEY }
          }
        );

        const squad = squadRes.data.response[0]?.players || [];

        for (const pl of squad) {
          const pid = pl.id;

          if (!players[pid]) {
            players[pid] = {
              id: pid,
              name: pl.name,
              appearances: 0
            };
          }

          // Get player stats for this season
          const statsRes = await axios.get(
            "https://v3.football.api-sports.io/players",
            {
              params: { id: pid, season, league },
              headers: { "x-apisports-key": KEY }
            }
          );

          const stats = statsRes.data.response[0]?.statistics || [];

          const apps = stats.reduce(
            (sum, s) => sum + (s.games.appearences || 0),
            0
          );

          players[pid].appearances += apps;
        }
      }
    }

    // Remove players with 0 total appearances
    cache = Object.values(players).filter(p => p.appearances > 0);

    last = Date.now();
    res.json(cache);

  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "API failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API ready"));
