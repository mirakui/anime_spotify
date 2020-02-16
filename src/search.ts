import axios, { AxiosResponse } from "axios";
import querystring from "querystring";

const clientId = process.env.SPOTIFY_CLIENT_ID || "";
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";

async function login(clientId: string, clientSecret: string) {
  const ax = axios.create({
    baseURL: "https://accounts.spotify.com",
    headers: {
      Authorization:
        "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64")
    }
  });
  try {
    const params = {
      grant_type: "client_credentials"
    };
    const res = await ax.post("/api/token", querystring.stringify(params), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const accessToken = res.data.access_token;
    return accessToken;
  } catch (err) {
    console.log("login error:", err);
    throw err;
  }
}

async function main() {
  const accessToken = await login(clientId, clientSecret);
  console.log("accessToken=", accessToken);
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
}

main();
