/**
 * Priorities for your people — what the person who flew the delegates in
 * protects tonight. Each is 0..1. Some move the tables. All recolour chairs.
 */
import { tableWallKeepMm, CLEAR } from './world.mjs';

export const PRIORITY_TITLE = 'Priorities for your people';
export const PRIORITY_LEDE = 'You flew them in. Nudge what you protect. Tables move. Chairs recolour.';

export const PRIORITIES = [
  {
    id: 'square',
    kind: 'score',
    label: 'Square to the picture',
    left: 'Angle does not matter',
    right: 'Must be on-axis',
    blurb: 'Inside the 45° cone, facing the cloth. This is the awards-night seat.',
  },
  {
    id: 'detail',
    kind: 'score',
    label: 'Fine detail on the cloth',
    left: 'Huge names, people, cars',
    right: 'Spreadsheets and small type',
    blurb: 'Leave this down for winner names and video. Turn it up only if they must read a spreadsheet from the back.',
  },
  {
    id: 'speaker',
    kind: 'score',
    label: 'See the speaker',
    left: 'Speeches are a moment',
    right: 'The keynote is the night',
    blurb: 'Leave down when the picture is the show. Turn up if they came for the speaker.',
  },
  {
    id: 'space',
    kind: 'pack',
    label: 'Space between tables',
    left: 'Tables can sit close',
    right: 'Servers pass, conversations stay',
    blurb: 'Turn up and the room opens. Turn down if you need the extra tables.',
  },
  {
    id: 'columns',
    kind: 'pack',
    label: 'Keep off the columns',
    left: 'A pillar at the table is fine',
    right: 'Nobody sits against a column',
    blurb: 'Turn down if table conversation matters more than a column at your back. Tables will nest in.',
  },
  {
    id: 'standup',
    kind: 'pack',
    label: 'Room to stand and leave',
    left: 'Tight to the wall',
    right: 'Walk out without a fuss',
    blurb: 'Chair-back to the wall. The 910 mm fire path never moves.',
  },
];

export function defaultPriorities() {
  return {
    square: 0.9,
    detail: 0.12,
    speaker: 0.2,
    space: 0.85,
    columns: 0.72,
    standup: 0.82,
  };
}

export function priorityById(id) {
  return PRIORITIES.find((p) => p.id === id) || PRIORITIES[0];
}

export function packOptsFromPriorities(p, extra = {}) {
  const space = clamp01(p.space ?? 0.85);
  const columns = clamp01(p.columns ?? 0.72);
  const standup = clamp01(p.standup ?? 0.82);
  const standMm = Math.round(480 + 320 * standup);
  return {
    gap: Math.round(1000 + 800 * space),
    columnKeep: Math.round(80 + 1040 * columns),
    tableWallKeep: tableWallKeepMm(standMm),
    wallKeep: CLEAR.egress,
    foyerKeep: CLEAR.egress,
    screenKeep: extra.screenKeep != null ? extra.screenKeep : true,
    faceScreen: true,
    allowWallMin: false,
    ...extra,
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}
