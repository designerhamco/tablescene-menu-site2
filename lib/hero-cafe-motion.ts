import photoGeometry from "./hero-photo-geometry.json";
/** Marketing-only geometry in the shared1536×1024 camera plane. */
export type HeroPoint = readonly [number, number];
export type HeroQuad = readonly [HeroPoint, HeroPoint, HeroPoint, HeroPoint];
export const HERO_CAFE_CHAPTERS = [
  { label: "천장형 디스플레이", title: "큰 화면으로 보여주는 우리 매장 메뉴", body: "천장에 설치한 디스플레이에 메뉴판을 띄워, 멀리 있는 손님에게도 메뉴를 보여주세요.", image: "venue", focus: [1010, 480], mobileFocus: [950, 410], zoom: 1 },
  { label: "카운터 태블릿", title: "카운터에 놓고 보여주는 메뉴판", body: "카운터나 테이블에 태블릿을 거치해, 손님이 메뉴를 직접 살펴볼 수 있게 하세요.", image: "counter", focus: [1010, 515], mobileFocus: [1030, 500], zoom: 1.08 },
  { label: "테이블 태블릿", title: "손님께 직접 건네는 태블릿 메뉴판", body: "자리에 앉은 손님께 태블릿을 건네, 메뉴를 편하게 살펴보도록 안내하세요.", image: "dining", focus: [920, 540], mobileFocus: [920, 525], zoom: 1.04 },
  { label: "QR 모바일 메뉴판", title: "QR을 찍으면, 내 휴대폰이 메뉴판", body: "테이블 위 QR코드를 찍으면, 손님 휴대폰에서 바로 메뉴판이 열려요.", image: "phone", focus: [880, 500], mobileFocus: [860, 490], zoom: 1 },
] as const;
export const HERO_CAFE_PHOTOS = { venue: "venue.webp", counter: "counter.webp", dining: "dining.webp", phone: "phone-v3.webp" } as const;
/** Prepare at most one demo; the tablet may warm up near the end of the opening. */
export function heroLiveSceneAt(chapter: number, inView: boolean, visible: boolean, reduced: boolean, openingProgress = 0): "counter" | "dining" | "phone" | null {
  if (!inView || !visible || reduced) return null;
  if (chapter === 0 && openingProgress >= .65) return "counter";
  const image = HERO_CAFE_CHAPTERS[chapter]?.image;
  return image && image !== "venue" ? image : null;
}
/** Measured from the approved flat photos; all UI shares the unchanged1536×1024 camera plane. */
const measuredScreen = (scene: keyof typeof photoGeometry, index = 0) => photoGeometry[scene].screens[index] as unknown as HeroQuad;
export const HERO_CAFE_SCREENS = {
  televisions: [measuredScreen("venue",0),measuredScreen("venue",1),measuredScreen("venue",2)] as readonly HeroQuad[],
  venueTablet: measuredScreen("venue",3),
  counter: measuredScreen("counter"),
  dining: measuredScreen("dining"),
  phone: measuredScreen("phone"),
  qrCode: measuredScreen("phone",1),
};
/** Enough time for each native preview to finish its visible action sequence. */
/** Seconds are narrative positions, never a running playback clock. */
export const HERO_CHAPTER_DURATION_MS = [12000, 40000, 36000, 66000] as const;
export const HERO_CHAPTER_SCROLL_LENGTHS = [1.6, 4.4, 2.8, 6.6] as const;
export const HERO_COUNTER_TIMELINE = { browse: [5, 21], focus: [21, 27], zoom: [28, 36] } as const;
export const HERO_PHONE_TIMELINE = {
  qr: [.4, 5.8], camera: [5, 9], browse: [9, 20], reposition: [20, 22],
  item: [22, 28, 29], add: [29, 35, 36], cart: [36, 42, 43],
  typing: [44, 51], order: [53, 60, 62],
} as const;
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
export function heroSaleZoom(seconds: number, width: number) { return heroTween(seconds, ...HERO_COUNTER_TIMELINE.zoom) * (width < 1024 ? 1.8 : .6); }
/** Three templates appear once each; the opening never wraps back to the first. */
export function heroTemplateAt(progress: number) { return Math.min(HERO_TEMPLATE_SCREENS.length - 1, Math.floor(clampHeroProgress(progress) * HERO_TEMPLATE_SCREENS.length)); }
/** Repeating ripples are sampled from scroll, so a stopped/reversed scroll holds/reverses them. */
export function heroPulseAt(progress: number, cycles = 3) { return progress < 0 || progress >= 1 ? 0 : 1 - (clampHeroProgress(progress) * cycles) % 1; }
export function heroPhoneValue(seconds: number) { return "01000000000".slice(0, Math.floor(clampHeroProgress((seconds - HERO_PHONE_TIMELINE.typing[0]) / (HERO_PHONE_TIMELINE.typing[1] - HERO_PHONE_TIMELINE.typing[0])) * 11 + 1e-7)); }
/** Completed chapters stay full; current progress rewinds with the document scroll. */
export function heroSegmentProgressAt(segment: number, chapter: number, progress: number) {
  return segment < chapter ? 1 : segment === chapter ? clampHeroProgress(progress) : 0;
}
export function heroDemoPhase(kind: "counter" | "dining" | "phone", seconds: number) {
  const boundaries = kind === "dining" ? [6, 11, 18, 25, 31] : kind === "phone" ? [HERO_PHONE_TIMELINE.item[1], HERO_PHONE_TIMELINE.add[1], HERO_PHONE_TIMELINE.cart[1], HERO_PHONE_TIMELINE.typing[1], HERO_PHONE_TIMELINE.order[1]] : [];
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
