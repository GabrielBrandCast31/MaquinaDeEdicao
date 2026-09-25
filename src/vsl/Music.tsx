import {Audio} from '@remotion/media';
import React from 'react';
import {interpolate, staticFile} from 'remotion';

type K = [number, number][];
const env = (k: K) => (f: number) => interpolate(f, k.map((x) => x[0]), k.map((x) => x[1]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// Levels follow the narrative: discovery ↑, explanations ↓, tension before price, energy on offer & CTA.
const PAD: K = [[0, 0], [20, 0.1], [940, 0.1], [950, 0.05], [1050, 0.05], [1060, 0.09], [2070, 0.09], [2084, 0.12], [2380, 0.1], [2400, 0.075], [4120, 0.075], [4130, 0.06], [4515, 0.05], [4524, 0.11], [5360, 0.1], [5380, 0.05], [5580, 0.05], [5600, 0.08], [5925, 0.08], [5935, 0.12], [6250, 0.12], [6321, 0]];
const PULSE: K = [[0, 0], [40, 0.06], [940, 0.06], [950, 0], [1050, 0], [1060, 0.06], [2070, 0.06], [2084, 0.1], [2380, 0.09], [2400, 0.06], [4120, 0.06], [4130, 0], [4515, 0], [4524, 0.09], [5360, 0.08], [5380, 0], [5580, 0], [5600, 0.06], [5925, 0.06], [5935, 0.1], [6250, 0.1], [6321, 0]];
const DRIVE: K = [[0, 0], [2080, 0], [2084, 0.05], [2370, 0.05], [2390, 0], [4520, 0], [4524, 0.07], [5360, 0.06], [5375, 0], [5930, 0], [5936, 0.085], [6250, 0.085], [6321, 0]];

export const Music: React.FC = () => (
  <>
    <Audio name="Trilha — pad" src={staticFile('music/pad.wav')} loop volume={env(PAD)} />
    <Audio name="Trilha — pulse" src={staticFile('music/pulse.wav')} loop volume={env(PULSE)} />
    <Audio name="Trilha — drive" src={staticFile('music/drive.wav')} loop volume={env(DRIVE)} />
  </>
);
