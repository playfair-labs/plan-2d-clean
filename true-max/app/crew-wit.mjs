/**
 * Optional crew asides. Off by default. Never the job — just the banter
 * you used to do on the floor. No rudeness.
 */
const LINES = {
  avops: [
    'Skirt to the room. Ugly stays on our side.',
    'Desk first. Then the joke.',
  ],
  gaff: [
    'One tape. One lift. Not at 6:55.',
    'Straight run. Future-you still has a back.',
  ],
  patch: [
    'Label it now. Future-you is busy.',
    'Four holes. Four names. That’s the whole novel.',
  ],
  foldback: [
    'Under the deck. Ankles will thank you.',
    'Short XLR. Long day. Keep it under.',
  ],
  tree: [
    'Daisy, then stop. Don’t invent a third universe.',
    'DMX goes in the same gaff as the blue. That’s the gift.',
  ],
  distro: [
    'Behind the drape. Not through the house.',
    'Power boards live where guests don’t.',
  ],
  powerpoint: [
    'That’s the outlet. The other one is a rumour.',
    'Five metres beats a 30 you didn’t bring.',
  ],
  speaker: [
    'Local power. Signal in the wall run. No diagonals.',
    'If it’s in a corner, the cable is too.',
  ],
  lectern: [
    'Channel 1. Tap the box if you forget. We all forget.',
  ],
  camera: [
    'He’s on the riser. The PC can wait. It won’t.',
  ],
  default: [
    'Do the run. Then the joke.',
    'Same plot. Slightly better afternoon.',
  ],
};

export function crewWit(type) {
  const pool = LINES[type] || LINES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}
