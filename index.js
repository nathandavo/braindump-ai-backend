const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const KEY = process.env.API_FOOTBALL_KEY;

// Premier League league ID
const LEAGUE_ID = 39;

// Seasons to include
const SEASONS = [
  2014, 2015, 2016, 2017, 2018, 
  2019, 2020, 2021, 2022, 2023, 2024
];

// Team IDs
const MAN_CITY_ID = 50;
const LIVERPOOL_ID = 40;

// Fetch players with full pagination
async function fetchSeasonPlayers(season, teamId) {
  let page = 1;
  let allPlayers = [];

  while (true) {
    const res = await axios.get("https://v3.football.api-sports.io/players", {
      params: { league: LEAGUE_ID, season, team: teamId, page },
      headers: { "x-apisports-key": KEY },
    });

    const players = res.data.response;

    if (!players || players.length === 0) break;

    allPlayers.push(...players);

    if (page >= res.data.paging.total) break;

    page++;
  }

  return allPlayers;
}

// Sum appearances
function addAppearances(store, player) {
  const id = player.player.id;
  const name = player.player.name;
  const apps = player.statistics[0].games.appearences || 0;

  if (!store[id]) {
    store[id] = { id, name, appearances: 0 };
  }

  store[id].appearances += apps;
}

// Sum goals + assists
function addGoalsAssists(store, player) {
  const id = player.player.id;
  const name = player.player.name;
  const goals = player.statistics[0].goals.total || 0;
  const assists = player.statistics[0].goals.assists || 0;

  if (!store[id]) {
    store[id] = { id, name, ga: 0 };
  }

  store[id].ga += goals + assists;
}

/* -------------------------------
    1) MAN CITY – APPEARANCES
--------------------------------*/
app.get("/man-city/appearances", async (req, res) => {
  try {
    let results = {};

    for (const season of SEASONS) {
      const players = await fetchSeasonPlayers(season, MAN_CITY_ID);

      for (const p of players) {
        addAppearances(results, p);
      }
    }

    res.json(Object.values(results));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Man City appearances failed" });
  }
});

/* -------------------------------
    2) MAN CITY – GOALS + ASSISTS
--------------------------------*/
app.get("/man-city/goals-assists", async (req, res) => {
  try {
    let results = {};

    for (const season of SEASONS) {
      const players = await fetchSeasonPlayers(season, MAN_CITY_ID);

      for (const p of players) {
        addGoalsAssists(results, p);
      }
    }

    res.json(Object.values(results));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Man City GA failed" });
  }
});

/* -------------------------------
    3) LIVERPOOL – APPEARANCES
--------------------------------*/
app.get("/liverpool/appearances", async (req, res) => {
  try {
    let results = {};

    for (const season of SEASONS) {
      const players = await fetchSeasonPlayers(season, LIVERPOOL_ID);

      for (const p of players) {
        addAppearances(results, p);
      }
    }

    res.json(Object.values(results));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Liverpool appearances failed" });
  }
});

/* -------------------------------
    4) LIVERPOOL – GOALS + ASSISTS
--------------------------------*/
app.get("/liverpool/goals-assists", async (req, res) => {
  try {
    let results = {};

    for (const season of SEASONS) {
      const players = await fetchSeasonPlayers(season, LIVERPOOL_ID);

      for (const p of players) {
        addGoalsAssists(results, p);
      }
    }

    res.json(Object.values(results));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Liverpool GA failed" });
  }
});

// Run server
app.listen(3000, () => console.log("Server running on port 3000"));
