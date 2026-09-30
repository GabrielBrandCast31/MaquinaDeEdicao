import {Audio} from '@remotion/media';
import React from 'react';
import {Sequence, staticFile} from 'remotion';

export type SfxName =
  | 'whoosh' | 'whip' | 'switch' | 'mouse-click' | 'ding' | 'page-turn' | 'shutter-modern'
  | 'click' | 'pop' | 'confirm' | 'glitch' | 'tick' | 'ui-open' | 'drop' | 'glass' | 'error'
  | 'bass' | 'shimmer' | 'hit' | 'rise-short' | 'riser' | 'sub' | 'notif';

/** One sound effect placed at an absolute frame of the parent timeline. */
export const Sfx: React.FC<{at: number; name: SfxName; volume?: number; dur?: number}> = ({at, name, volume = 0.5, dur = 90}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={dur} layout="none" name={`sfx:${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
