const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY;

let cache = null;
let last = 0;

app.get("/players", async (req, res) => {
  try {
    if (cache && Date.now() - last < 86400000) return res.json(cache);

    const league = 39; // Premier League
    const seasons = [
      2010, 2011, 2012, 2013, 2014, 2015, 2016,
      2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024
    ];

    // Premier League teams (API FOOTBALL IDs)
    const teams = [
      33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
      45, 46, 47, 48, 49, 50, 51, 52, 55, 57
    ];

    let players = {};

    for (const season of seasons) {
      console.log("Fetching squads for season:", season);

      for (const team of teams) {
        // 1) Get full squad
        const squadRes = await axios.get(
          "https://v3.football.api-sports.io/players/squads",
          {
            params: { team },
            headers: { "x-apisports-key": KEY }
          }
        );

        const squad = squadRes.data.response[0]?.players || [];
        for (const pl of squad) {
          const id = pl.id;

          if (!players[id]) {
            players[id] = {
              id,
              name: pl.name,
              appearances: 0
            };
          }

          // 2) Get player's stats for this season
          const statsRes = await axios.get(
            "https://v3.football.api-sports.io/players",
            {
              params: { id, season, league },
              headers: { "x-apisports-key": KEY }
            }
          );

          const stats = statsRes.data.response[0]?.statistics || [];
          const apps = stats.reduce(
            (sum, s) => sum + (s.games.appearences || 0),
            0
          );

          players[id].appearances += apps;
        }
      }
    }

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
