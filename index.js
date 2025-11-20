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
    const team = 50;   // Manchester City ID
    const seasons = [
      2014, 2015, 2016, 2017, 2018, 
      2019, 2020, 2021, 2022, 2023, 2024
    ];

    let players = {};

    for (const season of seasons) {
      console.log(`Fetching Man City season ${season}`);

      let page = 1;
      while (true) {
        // Query players who played in the PL for Man City in that season
        const response = await axios.get(
          "https://v3.football.api-sports.io/players",
          {
            params: { league, season, team, page },
            headers: { "x-apisports-key": KEY }
          }
        );

        const data = response.data.response;
        if (data.length === 0) break;

        for (const p of data) {
          const id = p.player.id;

          if (!players[id]) {
            players[id] = {
              id,
              name: p.player.name,
              appearances: 0
            };
          }

          const apps = p.statistics[0]?.games?.appearences || 0;
          players[id].appearances += apps;
        }

        if (data.length < 20) break;
        page++;
      }
    }

    // Only players with appearances
    cache = Object.values(players).filter(p => p.appearances > 0);
    last = Date.now();

    res.json(cache);
  } catch (err) {
    console.error("API ERROR →", err.response?.data || err);
    res.status(500).json({ error: err.response?.data || "API failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API ready"));
