import { settings } from "./settings";
import { intro } from "./intro";
import { about } from "./about";
import { menu } from "./menu";
import { events } from "./events";
import { normalizeRestaurantData } from "../lib/normalizeRestaurantData";

export const restaurantData = normalizeRestaurantData({
  settings,
  intro,
  about,
  menu,
  events,
});
