import * as Anton from '@remotion/google-fonts/Anton';
import * as ArchivoBlack from '@remotion/google-fonts/ArchivoBlack';
import * as Bangers from '@remotion/google-fonts/Bangers';
import * as BebasNeue from '@remotion/google-fonts/BebasNeue';
import * as DMSans from '@remotion/google-fonts/DMSans';
import * as Inter from '@remotion/google-fonts/Inter';
import * as LeagueSpartan from '@remotion/google-fonts/LeagueSpartan';
import * as Montserrat from '@remotion/google-fonts/Montserrat';
import * as Oswald from '@remotion/google-fonts/Oswald';
import * as Outfit from '@remotion/google-fonts/Outfit';
import * as PlayfairDisplay from '@remotion/google-fonts/PlayfairDisplay';
import * as Poppins from '@remotion/google-fonts/Poppins';
import * as Roboto from '@remotion/google-fonts/Roboto';
import * as Sora from '@remotion/google-fonts/Sora';
import type {FontName} from './types';

type FontModule = {loadFont: (style?: 'normal', opts?: {weights?: string[]; subsets?: string[]}) => {fontFamily: string}; getInfo: () => {fonts: {normal?: Record<string, unknown>}}};

const MODULES: Record<FontName, FontModule> = {
  Anton, ArchivoBlack, Bangers, BebasNeue, DMSans, Inter, LeagueSpartan,
  Montserrat, Oswald, Outfit, PlayfairDisplay, Poppins, Roboto, Sora,
} as unknown as Record<FontName, FontModule>;

const loaded = new Map<string, string>();

/** Loads a Google font on first use (only the needed weight) and returns its CSS family. */
export const fontFamily = (name: FontName, weight: number): string => {
  const mod = MODULES[name] ?? MODULES.Montserrat;
  const available = Object.keys(mod.getInfo().fonts.normal ?? {});
  const w = available.includes(String(weight)) ? String(weight) : available.includes('700') ? '700' : available[0];
  const key = `${name}:${w}`;
  const cached = loaded.get(key);
  if (cached) return cached;
  const {fontFamily: family} = mod.loadFont('normal', {weights: [w], subsets: ['latin', 'latin-ext']});
  loaded.set(key, family);
  return family;
};
