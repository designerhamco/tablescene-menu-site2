/** Native Unicode emoji: rendered by each device, without bundled image/font assets. */
export const FLOOR_ROOM_ICONS=[
 {value:"",label:"없음"},
 {value:"🏠",label:"메인홀"},
 {value:"🍽️",label:"다이닝"},
 {value:"🌿",label:"테라스"},
 {value:"🪟",label:"발코니"},
 {value:"🚪",label:"개별룸"},
 {value:"👥",label:"단체룸"},
 {value:"🛋️",label:"라운지"},
 {value:"☕",label:"카페"},
 {value:"🍷",label:"바"},
 {value:"⭐",label:"특별룸"},
 {value:"🏕️",label:"야외"},
 {value:"🧸",label:"키즈룸"},
] as const;
export function isFloorRoomIcon(value:unknown):value is string{return typeof value==="string"&&FLOOR_ROOM_ICONS.some(item=>item.value===value);}
