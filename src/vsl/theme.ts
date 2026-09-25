import {loadFont as loadSora} from '@remotion/google-fonts/Sora';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {Easing} from 'remotion';

export const display = loadSora('normal', {weights: ['400', '600', '700', '800'], subsets: ['latin', 'latin-ext']}).fontFamily;
export const body = loadInter('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext']}).fontFamily;
export const mono = loadMono('normal', {weights: ['500', '700'], subsets: ['latin']}).fontFamily;

export const C = {
  bg: '#07060C',
  bg2: '#0E0B18',
  panel: 'rgba(22, 18, 38, 0.72)',
  panelSolid: '#161226',
  line: 'rgba(167, 139, 250, 0.22)',
  lineSoft: 'rgba(255,255,255,0.08)',
  violet: '#7C5CFF',
  violetLight: '#A78BFA',
  glow: 'rgba(124, 92, 255, 0.55)',
  white: '#F6F4FF',
  muted: 'rgba(246,244,255,0.58)',
  mint: '#4DF0C0',
  coral: '#FF5A6A',
  amber: '#FFC857',
};

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
