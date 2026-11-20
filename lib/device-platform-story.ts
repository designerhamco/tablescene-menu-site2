export const DEVICE_STAGES = [
  { id: "monitor", label: "PC 모니터", src: "/assets/device-template-scroll-v1/crema-monitor.webp" },
  { id: "tablet-landscape", label: "가로 태블릿", src: "/assets/device-template-scroll-v1/crema-tablet.webp" },
  { id: "tablet-portrait", label: "세로 태블릿", src: "/assets/device-template-scroll-v1/crema-tablet-portrait.webp" },
  { id: "phone", label: "모바일", src: "/assets/device-screen-correction-v1/crema-phone.webp" },
] as const;

export const DEVICE_MONITOR_PHOTO = {
  src: "/assets/device-platform-v2/monitor.webp",
  width: 1374,
  height: 1145,
  bodyX: 46,
  bodyWidth: 1282,
  standY: 780,
  standHeight: 323,
} as const;

const lastStage = DEVICE_STAGES.length - 1;
export const deviceStageProgress = (index: number) => index / lastStage;
export const clampDeviceProgress = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function smoothBetween(value: number, start: number, end: number) {
  const fraction = clampDeviceProgress((value - start) / (end - start));
  return fraction * fraction * (3 - 2 * fraction);
}

function mix(start: number, end: number, fraction: number) {
  return start + (end - start) * fraction;
}

/** One scroll position controls the shell, stand and each responsive capture. */
export function deviceMorphAt(width: number, height: number, progress: number) {
  const position = clampDeviceProgress(progress) * lastStage;
  const segment = Math.min(lastStage - 1, Math.floor(position));
  const transition = smoothBetween(position - segment, .13, .87);
  const monitorWidth = Math.min(width * .91, height * 1.19, 906);
  // This diagonal fits the art area without shrinking the tablet as it rotates.
  const tabletWidth = Math.min(width * .77, height * .8, 716);
  const phoneHeight = tabletWidth * .84;
  const frames = [
    { width: monitorWidth, height: monitorWidth * .58, bezel: monitorWidth * .011, radius: monitorWidth * .013, rotation: 0 },
    { width: tabletWidth, height: tabletWidth * .702, bezel: tabletWidth * .034, radius: tabletWidth * .038, rotation: 0 },
    { width: tabletWidth, height: tabletWidth * .702, bezel: tabletWidth * .034, radius: tabletWidth * .038, rotation: -90 },
    { width: phoneHeight, height: phoneHeight * .49, bezel: phoneHeight * .024, radius: phoneHeight * .074, rotation: -90 },
  ];
  const from = frames[segment], to = frames[segment + 1];
  const frameWidth = mix(from.width, to.width, transition);
  const frameHeight = mix(from.height, to.height, transition);
  const bezel = Math.max(2, mix(from.bezel, to.bezel, transition));
  const rotation = mix(from.rotation, to.rotation, transition);
  const radians = rotation * Math.PI / 180;
  const rotatedHeight = Math.abs(frameWidth * Math.sin(radians)) + Math.abs(frameHeight * Math.cos(radians));

  const standOpacity = segment === 0 ? 1 - smoothBetween(transition, .08, .75) : 0;
  const photoScale = frameWidth / DEVICE_MONITOR_PHOTO.bodyWidth;
  const standHeight = DEVICE_MONITOR_PHOTO.standHeight * photoScale;
  const standLift = standHeight * standOpacity / 2;
  const outgoing = segment === 1 ? 1 - smoothBetween(transition, .41, .65) : 1 - smoothBetween(transition, .19, .58);
  const incoming = segment === 1 ? smoothBetween(transition, .38, .68) : smoothBetween(transition, .22, .73);

  return {
    active: Math.round(position),
    width: frameWidth,
    height: frameHeight,
    bezel,
    radius: Math.max(4, mix(from.radius, to.radius, transition)),
    rotation,
    standHeight,
    standLift,
    standTop: frameHeight / 2 - standLift - 2,
    standOpacity,
    photoScale,
    shadowTop: rotatedHeight / 2 - standLift + standHeight * standOpacity + 4,
    shadowWidth: frameWidth * .46,
    tabletDetail: segment === 0 ? transition : segment === 1 ? 1 : 1 - transition,
    phoneDetail: segment === 2 ? smoothBetween(transition, .6, 1) : 0,
    screenOpacity: DEVICE_STAGES.map((_, index) => index === segment ? outgoing : index === segment + 1 ? incoming : 0),
  };
}
