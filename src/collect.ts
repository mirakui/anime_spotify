import cheerio from "cheerio";
import Axios from "axios";

const baseUrl = "http://anison.info";

async function fetchProgramList() {
  const onairUrl = baseUrl + "/data/n.php?m=onair&genre=anison";
  let res = await Axios.get(onairUrl);
  const $ = cheerio.load(res.data);
  const items = $('table.sorted td[headers="program"] a');

  for (let i = 0; i < items.length; i++) {
    try {
      const item = $(items[i]);
      const programId: number = +(item.attr("href")?.match(/\d+/) ?? [])[0];
      const songs = await fetchSongList(programId);
      console.debug(item.text(), programId, songs);
    } catch (err) {
      console.debug(err);
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
