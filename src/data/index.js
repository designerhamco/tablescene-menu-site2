import { settings } from "./settings.js";
import { intro } from "./intro.js";
import { about } from "./about.js";
import { menu } from "./menu.js";
import { events } from "./events.js";
import { normalizeRestaurantData } from "../lib/normalizeRestaurantData.js";

export const restaurantData = normalizeRestaurantData({
  settings,
  intro,
  about,
  menu,
  events,
});
