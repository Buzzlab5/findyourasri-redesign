/**
 * The Expeditions page (Anthony, 15 Oct 2026): the San Marzano trip, and the
 * itineraries Asri has drawn up for Bhutan, New Zealand and Mongolia.
 *
 * Every line comes from the source: the San Marzano project on /work/ and
 * the trip decks (new-business/proposals/discover-bhutan, nz-south-island
 * and mongolia). The decks are addressed to San Marzano and the New Zealand
 * one carries its price, so none is linked or quoted for that: the page
 * keeps the route and the days, nothing more. Mongolia's dates, guest count
 * and launch are San Marzano's, so they stay off the page too.
 */

export type Pic = {
  src: string;
  w: number;
  h: number;
  alt: string;
  pos?: string;
};

export type Day = { title: string; overnight: string };

export type Itinerary = {
  slug: string;
  place: string;
  title: string;
  /** The deck's own line over its journey page. */
  line: string;
  route: string;
  body: string;
  days: Day[];
  /** One tall frame, then two beside it. */
  pics: [Pic, Pic, Pic];
  /** Shown under the pictures when they are not Asri's own. */
  credit?: string;
};

export const cover: Pic = {
  src: '/img/work/products/san-marzano-wine/05.jpg',
  w: 1900,
  h: 1069,
  alt: 'An aerial of five phinisi under sail on deep blue water, two of them under red sails',
  pos: '50% 50%',
};

/** The trip that has run: San Marzano in Komodo. */
export const delivered = {
  href: '/work/production/products/san-marzano-wine/',
  logo: { src: '/img/work/products/san-marzano-wine/logo.png', w: 88, h: 38 },
  place: 'Komodo',
  title: 'San Marzano at Sea',
  body: 'Five days of film and photography at sea, launching San Marzano’s limited edition rosé on the pink sand beaches of Komodo National Park.',
  terms: 'Five days · Film · Photography',
  main: {
    src: '/img/work/products/san-marzano-wine/04.jpg',
    w: 1900,
    h: 1267,
    alt: 'A woman in silhouette sipping a glass of rosé at sunset, ships anchored on the horizon',
  } satisfies Pic,
  inset: {
    src: '/img/work/products/san-marzano-wine/02.jpg',
    w: 1267,
    h: 1900,
    alt: 'A hand holding a bottle in the surf on pink sand',
  } satisfies Pic,
};

export const itineraries: Itinerary[] = [
  {
    slug: 'bhutan',
    place: 'Bhutan',
    title: 'Discover Bhutan',
    line: 'Three Valleys. Six Days.',
    route: 'Five nights · Thimphu · Punakha · Paro',
    body: 'Fly into Paro, drive to Thimphu, cross the mountains to Punakha, and end in Paro beneath the Tiger’s Nest.',
    days: [
      { title: 'Arrive Paro, drive to Thimphu', overnight: 'Thimphu' },
      { title: 'Thimphu Valley', overnight: 'Thimphu' },
      { title: 'Over the pass to Punakha', overnight: 'Punakha' },
      { title: 'Punakha, then Paro', overnight: 'Paro' },
      { title: 'The Tiger’s Nest', overnight: 'Paro' },
      { title: 'Depart Paro', overnight: 'Onward' },
    ],
    // Cam's own Bhutan frames, the ones already on /work/.
    pics: [
      {
        src: '/img/work/travel/bhutan-peaceful-tours/cover.jpg',
        w: 1920,
        h: 2400,
        alt: 'A white and gold monastery clinging to a cliff above a misty valley',
      },
      {
        src: '/img/work/travel/bhutan-peaceful-tours/more-01.jpg',
        w: 1600,
        h: 1000,
        alt: 'A monk in red robes walking along a covered wooden bridge',
        pos: '50% 50%',
      },
      {
        src: '/img/work/travel/bhutan-peaceful-tours/01.jpg',
        w: 1080,
        h: 607,
        alt: 'A fortress monastery with red roofs beside a river, seen from above',
      },
    ],
  },
  {
    slug: 'new-zealand',
    place: 'New Zealand',
    title: 'The South Island',
    line: 'Lake, Snow, Fiord. Six Days.',
    route: 'Five nights · Queenstown to Milford Sound',
    body: 'From Queenstown up into the snow, then over to Te Anau and down the Milford Road to the water, and back over the mountains by air.',
    days: [
      { title: 'Arrive in Queenstown', overnight: 'Queenstown' },
      { title: 'Glenorchy and the snow', overnight: 'Queenstown' },
      { title: 'Into Fiordland', overnight: 'Te Anau' },
      { title: 'The Milford Road, and a night on the water', overnight: 'Milford Sound' },
      { title: 'Over the mountains', overnight: 'Queenstown' },
      { title: 'Depart Queenstown', overnight: 'Onward' },
    ],
    // Cam's Drive holds no New Zealand photography: these are Unsplash
    // frames from the deck (rights rows 545, 548, 550 and 554), credited.
    pics: [
      {
        src: '/img/expeditions/new-zealand/cover.jpg',
        w: 1267,
        h: 1900,
        alt: 'The Remarkables in snow, lit pink at last light above Lake Wakatipu',
      },
      {
        src: '/img/expeditions/new-zealand/mitre.jpg',
        w: 1426,
        h: 1900,
        alt: 'Mitre Peak, snow on its summit, against a deep blue sky',
        pos: '50% 38%',
      },
      {
        src: '/img/expeditions/new-zealand/ms.jpg',
        w: 1900,
        h: 1425,
        alt: 'A boat on Milford Sound between green cliffs and cloud',
      },
    ],
    credit: 'New Zealand photographs by Peter Luo, Lé mynamestillolly and Eyrie Photography, on Unsplash.',
  },
  {
    slug: 'mongolia',
    place: 'Mongolia',
    title: 'Steppe, Desert, Sky',
    line: 'A Menu, Not an Itinerary.',
    route: 'Six days · The Gobi · Central Mongolia · Ulaanbaatar',
    body: 'Five choices make the trip: the regions, the night that matters most, twenty experiences, the stays, and what we film. Our route takes the Gobi, then the steppe, with Ulaanbaatar at either end.',
    // Steppe & Stone's suggested route, the deck's "Six days, three bases".
    days: [
      { title: 'Arrive in Ulaanbaatar', overnight: 'Ulaanbaatar' },
      { title: 'Charter to the Gobi, the Flaming Cliffs at sunset', overnight: 'The Gobi' },
      { title: 'Fossils, camels and a night without signal', overnight: 'The Gobi' },
      { title: 'Into Central Mongolia, and Erdene Zuu', overnight: 'The Orkhon steppe' },
      { title: 'Nomad families and the ride to Tövkhön', overnight: 'The Orkhon steppe' },
      { title: 'Charter to Ulaanbaatar', overnight: 'Onward' },
    ],
    // Max Muench's photographs, from the deck (rights rows 825, 855 and
    // 827: permission needed until Steppe & Stone's terms are recorded).
    pics: [
      {
        src: '/img/expeditions/mongolia/dunes.jpg',
        w: 1440,
        h: 1800,
        alt: 'A rider and camels on the knife edge of a great dune at golden hour',
      },
      {
        src: '/img/expeditions/mongolia/horses.jpg',
        w: 1800,
        h: 1201,
        alt: 'Horses along the edge of still water, mountains beyond',
      },
      {
        src: '/img/expeditions/mongolia/flaming.jpg',
        w: 1800,
        h: 1199,
        alt: 'The Flaming Cliffs at Bayanzag from the air',
      },
    ],
    credit: 'Built with Steppe & Stone. Mongolia photographs by Max Muench.',
  },
];
