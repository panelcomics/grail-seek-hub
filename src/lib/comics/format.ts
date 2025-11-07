// src/lib/comics/format.ts
export function formatComicDisplay(comic: {
  title?: string;             // story title from CV: "Invasion!"
  name?: string;              // some libs map story title here
  volume?: { name?: string; publisher?: { name?: string } };
  series_name?: string;       // your own field (optional)
  issue_number?: string | number;
  cover_date?: string;        // "1984-11-30" or "11/30/1984"
  publisher_name?: string;    // fallback
}) {
  const series =
    comic.volume?.name?.trim() ||
    comic.series_name?.trim() ||
    comic.title?.trim() ||      // ultimate fallback
    "Unknown Series";

  const issue =
    (comic.issue_number !== undefined && comic.issue_number !== null && String(comic.issue_number).trim() !== "")
      ? `#${comic.issue_number}` : "";

  const year = (() => {
    if (!comic.cover_date) return "";
    const m = comic.cover_date.match(/\d{4}/);
    return m ? ` (${m[0]})` : "";
  })();

  const story =
    (comic.name || comic.title)?.trim();
  const storyTitle =
    story && story.toLowerCase() !== "unknown" && story.toLowerCase() !== series.toLowerCase()
      ? story
      : "";

  const publisher =
    comic.volume?.publisher?.name || comic.publisher_name || "";

  return {
    mainTitle: `${series} ${issue}`.trim(),
    withYear: `${series} ${issue}${year}`.trim(),
    storyTitle,
    publisher,
  };
}
