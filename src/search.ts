import axios, { AxiosResponse } from "axios";
const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;

const ax = axios.create({
  baseURL: "https://api.spotify.com",
  headers: {
    Authorization: "Bearer " + accessToken,
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

ax.get("/v1/search", {
  params: {
    q: "椎名林檎",
    type: "track",
    market: "JP"
  }
})
  .then((res: AxiosResponse) => {
    console.log(res.data);
    for (let item of res.data.tracks.items) {
      console.log(item.name, item.artists[0].name);
    }
  })
  .catch((err: any) => {
    console.log(err);
  });
