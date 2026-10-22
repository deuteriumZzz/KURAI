import { Playfair_Display, Press_Start_2P, Tektur, Unbounded } from "next/font/google";

/** Шрифты только лендинга: Tektur — заголовки; остальные звучат лишь в переборе заголовка первого экрана. */
const tektur = Tektur({ variable: "--font-tektur", subsets: ["latin", "cyrillic"], axes: ["wdth"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["cyrillic"], style: "italic", weight: "700" });
const pixel = Press_Start_2P({ variable: "--font-pixel", subsets: ["cyrillic"], weight: "400" });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["cyrillic"], weight: "800" });

export const landingFonts = [tektur, playfair, pixel, unbounded].map((font) => font.variable).join(" ");
