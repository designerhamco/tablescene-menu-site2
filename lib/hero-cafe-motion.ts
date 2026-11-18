/** Marketing-only camera geometry. Coordinates belong to the authored 1536×1024 photos. */
export type HeroPoint = readonly [number, number];
export type HeroQuad = readonly [HeroPoint, HeroPoint, HeroPoint, HeroPoint];
export const HERO_CAFE_CHAPTERS = [
  { label: "매장", title: "메뉴를 보여주는 순간, 매장이 달라집니다", body: "디자인부터 메뉴 관리까지. 우리 매장에 맞는 디지털 메뉴판, 아티메뉴.", image: "venue", focus: [1010, 480], mobileFocus: [950, 410], zoom: 1 },
  { label: "태블릿", title: "가까이에서 고르는 오늘의 메뉴", body: "메뉴와 가격, 지금의 혜택을 한눈에.", image: "counter", focus: [1010, 515], mobileFocus: [1030, 500], zoom: 1.08 },
  { label: "다이닝", title: "한 장씩 이어지는 다이닝 경험", body: "커버부터 코스까지, 옆으로 넘겨 살펴보세요.", image: "dining", focus: [920, 540], mobileFocus: [920, 525], zoom: 1.04 },
  { label: "QR 주문", title: "QR로 열고, 고른 메뉴를 주문까지", body: "메뉴를 둘러보고 장바구니에 담아, 손님 휴대폰에서 바로.", image: "phone", focus: [880, 500], mobileFocus: [860, 490], zoom: 1 },
] as const;
export const HERO_CAFE_PHOTOS = { venue: "venue.webp", counter: "counter.webp", dining: "dining.webp", phone: "phone-v3.webp" } as const;
export const HERO_CAFE_SCREENS = {
  televisions: [
    [[505,290],[739,277],[739,420],[505,424]],
    [[760,273],[1034,255],[1034,414],[760,419]],
    [[1057,256],[1370,233],[1370,407],[1057,412]],
  ] as readonly HeroQuad[],
  venueTablet: [[1113,532.8],[1216.7,534],[1204.7,603.3],[1100.7,599.6]] as HeroQuad,
  counter: [[758,291],[1374,288],[1339,704],[707,690]] as HeroQuad,
  dining: [[575,283],[1266,295],[1231,774],[515,731]] as HeroQuad,
  phone: [[871,180],[1129,191],[1071,798],[809,775]] as HeroQuad,
};
/** Enough time for each native preview to finish its visible action sequence. */
/** Seconds are narrative positions, never a running playback clock. */
export const HERO_CHAPTER_DURATION_MS = [12000, 26000, 36000, 46000] as const;
export const HERO_CHAPTER_SCROLL_LENGTHS = [1.6, 2.2, 2.8, 4.6] as const;
export const HERO_SCROLL_LENGTH = HERO_CHAPTER_SCROLL_LENGTHS.reduce((sum, length) => sum + length, 0);
export const HERO_STORY_SVH = (1 + HERO_SCROLL_LENGTH) * 100;
export function heroProgressAt(chapter: number, fraction = 0) {
  const index = Math.max(0, Math.min(HERO_CAFE_CHAPTERS.length - 1, Math.floor(chapter)));
  return (HERO_CHAPTER_SCROLL_LENGTHS.slice(0, index).reduce((sum, length) => sum + length, 0) + HERO_CHAPTER_SCROLL_LENGTHS[index] * clampHeroProgress(fraction)) / HERO_SCROLL_LENGTH;
}
export function heroTween(time: number, start: number, end: number) {
  const t = clampHeroProgress((time - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export function heroSaleZoom(seconds: number, width: number) { return heroTween(seconds, 14, 22) * (width < 1024 ? 1.8 : .3); }
export function heroDemoPhase(kind: "counter" | "dining" | "phone", seconds: number) {
  const boundaries = kind === "dining" ? [6, 11, 18, 25, 31] : kind === "phone" ? [23, 28, 33, 34, 40] : [];
  return boundaries.filter(boundary => seconds >= boundary).length;
}

export const HERO_TEMPLATE_SCREENS = ["matcha", "rosy", "loop"] as const;
export const clampHeroProgress = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function heroChapterAt(progress: number) {
  const position = clampHeroProgress(progress) * HERO_SCROLL_LENGTH;
  let end = 0;
  for (let index = 0; index < HERO_CHAPTER_SCROLL_LENGTHS.length; index++) {
    end += HERO_CHAPTER_SCROLL_LENGTHS[index];
    if (position < end - 1e-9) return index;
  }
  return HERO_CAFE_CHAPTERS.length - 1;
}
/** Scroll seeking uses the current scene's own clock, including the final scene's inclusive end. */
export function heroSceneAt(progress: number) {
  const chapter = heroChapterAt(progress);
  const start = HERO_CHAPTER_SCROLL_LENGTHS.slice(0, chapter).reduce((sum, length) => sum + length, 0);
  const fraction = clampHeroProgress(progress) === 1 ? 1 : clampHeroProgress((clampHeroProgress(progress) * HERO_SCROLL_LENGTH - start) / HERO_CHAPTER_SCROLL_LENGTHS[chapter]);
  return { chapter, fraction, elapsed: fraction * HERO_CHAPTER_DURATION_MS[chapter] };
}

/** A projective transform maps all four real screen corners without changing renderer geometry. */
export function heroScreenMatrix(quad: HeroQuad, width: number, height: number): string {
  const source = [[0,0],[width,0],[width,height],[0,height]];
  const rows: number[][] = [];
  source.forEach(([x,y], i) => {
    const [u,v] = quad[i];
    rows.push([x,y,1,0,0,0,-u*x,-u*y,u], [0,0,0,x,y,1,-v*x,-v*y,v]);
  });
  for (let i=0; i<8; i++) {
    let pivot=i;
    for (let j=i+1;j<8;j++) if (Math.abs(rows[j][i]) > Math.abs(rows[pivot][i])) pivot=j;
    [rows[i],rows[pivot]]=[rows[pivot],rows[i]];
    if (Math.abs(rows[i][i]) < 1e-10) throw new Error("Invalid hero screen geometry");
    const divisor=rows[i][i]; rows[i]=rows[i].map(value=>value/divisor);
    for (let j=0;j<8;j++) if(j!==i) { const factor=rows[j][i]; rows[j]=rows[j].map((value,k)=>value-factor*rows[i][k]); }
  }
  const [a,b,c,d,e,f,g,h]=rows.map(row=>row[8]);
  return `matrix3d(${[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].join(",")})`;
}
