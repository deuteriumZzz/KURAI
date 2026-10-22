import { Playfair_Display, Press_Start_2P, Sofia_Sans_Extra_Condensed, Unbounded } from "next/font/google";

/** Почерки перебора в заголовке первого экрана — только на лендинге; Tektur подключён для всего сайта в layout. */
const cond = Sofia_Sans_Extra_Condensed({ variable: "--font-sofia-cond", subsets: ["cyrillic"], weight: "800" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["cyrillic"], style: "italic", weight: "700" });
const pixel = Press_Start_2P({ variable: "--font-pixel", subsets: ["cyrillic"], weight: "400" });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["cyrillic"], weight: "800" });

export const landingFonts = [cond, playfair, pixel, unbounded].map((font) => font.variable).join(" ");
