app.get("/players", async (req, res) => {
  try {
    if (cache && Date.now() - last < 86400000) return res.json(cache);

    const league = 39; // Premier League
    const seasons = [
      2010, 2011, 2012, 2013, 2014, 2015,
      2016, 2017, 2018, 2019, 2020, 2021,
      2022, 2023, 2024
    ];

    let players = {};

    for (const season of seasons) {
      console.log("SEASON →", season);

      let page = 1;

      while (true) {
        const { data } = await axios.get(
          "https://v3.football.api-sports.io/players",
          {
            params: { league, season, page },
            headers: { "x-apisports-key": KEY }
          }
        );

        const resPlayers = data.response;

        if (resPlayers.length === 0) break;

        for (const p of resPlayers) {
          const id = p.player.id;
          const name = p.player.name;

          const appearances =
            p.statistics[0]?.games?.appearences ?? 0;

          if (!players[id]) {
            players[id] = {
              id,
              name,
              appearances: 0
            };
          }

          players[id].appearances += appearances;
        }

        if (resPlayers.length < 20) break;
        page++;
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
