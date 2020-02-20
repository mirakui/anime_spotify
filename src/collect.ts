import cheerio from "cheerio";
import Axios from "axios";

const baseUrl = "http://anison.info";

async function fetchProgramList() {
  const onairUrl = baseUrl + "/data/n.php?m=onair&genre=anison";
  let res = await Axios.get(onairUrl);
  const $ = cheerio.load(res.data);
  const trs = $("table.sorted tbody tr");
  let result = [];

  for (let i = 0; i < trs.length; i++) {
    try {
      const tdGenre = $('td[headers="genre"]', trs[i]);
      if (tdGenre.text() != "テレビアニメーション") {
        continue;
      }
      const tdProgram = $('td[headers="program"] a', trs[i]);
      const tdBbs = $('td[headers="bbs"]', trs[i]);
      const tdWeek = $('td[headers="week"]', trs[i]);
      const tdTime = $('td[headers="time"]', trs[i]);
      const programId: number = +(tdProgram.attr("href")?.match(/\d+/) ??
        [])[0];
      const songs = await fetchSongList(programId);
      const data = {
        program: tdProgram.text().trim(),
        bbs: tdBbs.text().trim(),
        week: tdWeek.text().trim(),
        time: tdTime.text().trim(),
        songs: songs
      };
      console.debug(data);
      result.push(data);
    } catch (err) {
      console.debug(err);
      process.abort();
    }
  }
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

async function fetchSongList(programId: number) {
  const programUrl = baseUrl + "/data/program/" + programId + ".html";
  const res = await Axios.get(programUrl);
  const $ = cheerio.load(res.data);
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

async function main() {
  fetchProgramList();
}

main();
