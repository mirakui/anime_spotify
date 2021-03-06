import cheerio from "cheerio";
import Axios from "axios";
import yargs from "yargs";
import fs from "fs";

const baseUrl = "http://anison.info";
Axios.interceptors.request.use(request => {
  console.debug("Axios:", request.url);
  return request;
});

async function fetchProgramList(year: number, month: number) {
  const onairUrl =
    baseUrl + `/data/y.php?m=pro&genre=anison&year=${year}&month=${month}`;
  let res = await Axios.get(onairUrl);
  const $ = cheerio.load(res.data);
  const trs = $("table.sorted tbody tr");
  let result = [];

  for (let i = 0; i < trs.length; i++) {
    try {
      const tdGenre = $('td[headers="genre"]', trs[i]);
      if (!tdGenre.text().match(/アニメーション/)) {
        continue;
      }
      const tdProgram = $('td[headers="program"] a', trs[i]);
      const programId: number = +(tdProgram.attr("href")?.match(/\d+/) ??
        [])[0];
      const program = await fetchProgram(programId);
      let data = {
        program: tdProgram.text().trim(),
        genre: tdGenre.text().trim(),
        ...program.meta,
        songs: program.songs
      };
      console.debug("Program:", data.program);
      result.push(data);
    } catch (err) {
      console.debug(err);
      process.abort();
    }
  }
  return result;
}

function parseCellText(node: Cheerio, $: CheerioStatic) {
  let result: string[] = [];
  let buff = "";
  for (let i = 0; i < node[0].children.length; i++) {
    const t = $(node[0].children[i])
      .text()
      .trim();
    if (t != "") {
      buff += t;
    } else {
      result.push(buff);
      buff = "";
    }
  }
  return result;
}

function parseSongListFromProgram($: CheerioStatic) {
  const trs = $("table.sorted tbody tr");

  let songs = [];
  for (let i = 0; i < trs.length; i++) {
    const tdOped = $('td[headers="oped"]', trs[i]);
    const tdSong = $('td[headers="song"]', trs[i]);
    const tdVocal = $('td[headers="vocal"]', trs[i]);
    const tdLyrics = $('td[headers="lyrics"]', trs[i]);
    const tdCompose = $('td[headers="compose"]', trs[i]);
    const tdArrange = $('td[headers="arrange"]', trs[i]);
    if (tdSong.text() == "") {
      continue;
    }
    songs[i] = {
      oped: tdOped.text().trim(),
      song: tdSong.text().trim(),
      vocal: parseCellText(tdVocal, $),
      lyrics: parseCellText(tdLyrics, $),
      compose: parseCellText(tdCompose, $),
      arrange: parseCellText(tdArrange, $)
    };
  }
  return songs;
}

function parseMetaInfoFromProgram($: CheerioStatic) {
  const tables = $("table.list");
  let isMetaTable = false;
  for (let i = 0; i < tables.length; i++) {
    const ths = $("thead tr th.list", tables[i]);
    for (let j = 0; j < ths.length; j++) {
      const th = $(ths[j]);
      if (th.text().trim() == "放映局") {
        isMetaTable = true;
        break;
      }
    }
    if (isMetaTable) {
      const trs = $("tbody tr", tables[i]);
      const tds = $("td.list", trs[trs.length - 1]);
      const bbs = $(tds[0])
        .text()
        .trim();
      const dateFrom = $(tds[1])
        .text()
        .trim();
      const dateTo = $(tds[3])
        .text()
        .trim();
      const week = $(tds[4])
        .text()
        .trim();
      const time = $(tds[5])
        .text()
        .split(/ *- */);
      return {
        bbs: bbs,
        dateFrom: dateFrom,
        dateTo: dateTo,
        week: week,
        timeFrom: time[0],
        timeTo: time[1]
      };
    }
  }
  return {};
}

async function fetchProgram(programId: number) {
  const programUrl = baseUrl + "/data/program/" + programId + ".html";
  const res = await Axios.get(programUrl);
  const $ = cheerio.load(res.data);
  const meta = parseMetaInfoFromProgram($);
  const songs = parseSongListFromProgram($);
  return { meta: meta, songs: songs };
}

type SeasonString = "winter" | "spring" | "summer" | "autumn";

function seasonToMonth(season: SeasonString) {
  const table: { [key: string]: number[] } = {
    winter: [1, 2, 3],
    spring: [4, 5, 6],
    summer: [7, 8, 9],
    autumn: [10, 11, 12]
  };
  return table[season];
}

function getCurrentSeason(date: Date): SeasonString {
  const month = date.getMonth() + 1;
  if (month in [1, 2, 3]) {
    return "winter";
  } else if (month in [4, 5, 6]) {
    return "spring";
  } else if (month in [7, 8, 9]) {
    return "summer";
  } else if (month in [10, 11, 12]) {
    return "autumn";
  } else {
    throw `Unknown month: ${month}`;
  }
}

async function main() {
  const now = new Date();
  const argv = yargs
    .option("year", {
      type: "number",
      default: now.getFullYear()
    })
    .option("season", {
      choices: ["winter", "spring", "summer", "autumn"],
      default: getCurrentSeason(now)
    }).argv;

  const months = seasonToMonth(argv.season);
  let result: any = [];
  for (let month of months) {
    result = result.concat(await fetchProgramList(argv.year, month));
  }

  const programsJsonPath = "programs.json";
  const resultJson = JSON.stringify(result);
  fs.writeFileSync(programsJsonPath, resultJson);

  console.log("Wrote", programsJsonPath);
}

main();
