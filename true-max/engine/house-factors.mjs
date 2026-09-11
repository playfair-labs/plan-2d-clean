/**
 * Hotel-manager "what's the show?" — which cloths are live, or is it
 * a speaker with no picture. Packing keep-outs and seat scoring follow.
 */
import { bboxOf } from './geom.mjs';
import { CLEAR } from './world.mjs';

export const SHOW_MODES = [
  {
    id: 'all',
    label: 'All screens',
    blurb: 'Every cloth is live. The picture is the show — speeches are a tiny part. Chairs are judged on screen angle first. First furniture 2.8 m off each screen (1.8 m squeeze).',
  },
  {
    id: 'centre',
    label: 'Centre screen only',
    blurb: 'Only the middle cloth is live. Seat quality is the 45° cone of that one screen. Side screens stay on the wall but do not hold a keep.',
  },
  {
    id: 'none',
    label: 'No screens',
    blurb: 'No picture. Cloths dark. First furniture is the wall or the stage, not a 2.8 m cloth line.',
  },
  {
    id: 'speaker',
    label: 'Speaker on stage only',
    blurb: 'Speech only, no picture — the exception. Facing the speaker matters. No 2.8 m cloth line.',
  },
];

export function showModeById(id) {
  return SHOW_MODES.find((m) => m.id === id) || SHOW_MODES[0];
}

/** 0 = fine text / data (distance matters). 1 = huge names / IMAG (distance barely matters, square-on wins). */
export const CONTENT_DEFAULT = 1;

export const CONTENT_STOPS = [
  { t: 0, label: 'Fine text / data' },
  { t: 0.5, label: 'Slides' },
  { t: 1, label: 'Huge names / people / cars' },
];

export function contentTOf(factors = {}) {
  if (factors.content == null || factors.content === '') return CONTENT_DEFAULT;
  const t = Number(factors.content);
  if (!(t >= 0)) return CONTENT_DEFAULT;
  return Math.max(0, Math.min(1, t));
}

export function centreScreen(room) {
  const screens = room.screens || [];
  if (!screens.length) return null;
  const bb = bboxOf(room.room);
  const cx = (bb.minX + bb.maxX) / 2;
  return screens.reduce((best, s) => (Math.abs(s.x - cx) < Math.abs(best.x - cx) ? s : best));
}

export function resolveShow(room, factors = {}) {
  const physical = room.screens || [];
  const mode = factors.show || 'all';
  if (mode === 'none' || mode === 'speaker') {
    return {
      mode,
      physical,
      active: [],
      screenKeep: false,
      faceScreen: false,
      speakerOnly: mode === 'speaker',
    };
  }
  if (mode === 'centre') {
    const c = centreScreen(room);
    return {
      mode,
      physical,
      active: c ? [c] : [],
      screenKeep: true,
      faceScreen: true,
      speakerOnly: false,
    };
  }
  return {
    mode: 'all',
    physical,
    active: physical.slice(),
    screenKeep: true,
    faceScreen: true,
    speakerOnly: false,
  };
}

export function viewRoom(room, factors) {
  const r = resolveShow(room, factors);
  const p = factors.priorities || null;
  let contentT = contentTOf(factors);
  if (p && factors.content == null) contentT = 1 - (p.detail ?? 0.12);
  return {
    ...room,
    screens: r.active,
    showMode: r.mode,
    contentT,
    priorities: p,
  };
}

export function factorPackOpts(resolved, density, extra = {}) {
  const speakerFront = density.id === 'squeeze' ? 1400 : 1800;
  return {
    activeScreens: resolved.active,
    physicalScreens: resolved.physical,
    screenKeep: resolved.screenKeep && density.screenKeep,
    faceScreen: resolved.faceScreen && density.faceScreen,
    speakerOnly: resolved.speakerOnly,
    screenFront: resolved.speakerOnly
      ? speakerFront
      : (density.screenFront != null ? density.screenFront : extra.screenFront),
    foyerKeep: density.foyerKeep != null ? density.foyerKeep : CLEAR.egress,
  };
}
