/*
 * Works with their own independent spoke deployment (own repo + own PWA),
 * per api/catalog.json's hub-and-spoke model. Their /works/<slug>/ page just
 * redirects out to the spoke, and their catalog card links directly to the
 * spoke instead of to an in-site page.
 *
 * Today there's exactly one, but the architecture is designed for more (see
 * api/README.md). Add new entries here — every test that needs to tell
 * "has its own spoke" from "lives on this site" reads from this single list,
 * instead of a hardcoded id/title check scattered across each spec file.
 */
const SPOKE_WORKS = [
  {
    id: 'lets-build-on-aws-together',
    title: "Let's Build on AWS Together",
    destination: 'https://ai2m2ia.github.io/book-lets-build-on-aws-together/',
  },
];

const SPOKE_WORK_IDS = SPOKE_WORKS.map(w => w.id);
const SPOKE_WORK_TITLES = SPOKE_WORKS.map(w => w.title);

const isSpokeWork = ({ id, title } = {}) =>
  (id !== undefined && SPOKE_WORK_IDS.includes(id)) ||
  (title !== undefined && SPOKE_WORK_TITLES.includes(title));

module.exports = { SPOKE_WORKS, SPOKE_WORK_IDS, SPOKE_WORK_TITLES, isSpokeWork };
