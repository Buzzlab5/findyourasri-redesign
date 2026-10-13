import { media } from '@/lib/media';

/**
 * The Production portfolio: one entry per client, shown as a tile on its tab
 * and opened as its own page (cover, story, then a gallery that scrolls
 * sideways).
 *
 * Images are web-optimised copies of the originals in _src/img/new-image
 * (cover 2400px, gallery 1900px, EXIF removed) under public/img/work. The
 * Hidden Hills and Cocosolis films are 1920px (1280px for phones) on the Bunny
 * CDN through `media()`, at the root of the storage zone. Posters stay local
 * in public/video/work.
 * Location and `lead` come from the campaign descriptions the client team
 * supplied; the gallery stories and alt text are drafts written from the
 * photographs: edit freely, and keep out em dashes (scripts/check-build.mjs fails the build).
 */

export type ProjectTabSlug = 'travel' | 'hospitality' | 'products';

export type ProjectImage = {
  src: string;
  w: number;
  h: number;
  alt: string;
  /** CSS object-position for a tight crop where the subject sits off centre. */
  pos?: string;
};

export type ProjectMedia =
  | ({ type: 'image' } & Omit<ProjectImage, 'pos'>)
  | {
      type: 'video';
      title: string;
      src: string;
      /** The 1280px cut phones get, where there is one. */
      srcSm?: string;
      poster: string;
      w: number;
      h: number;
      alt: string;
    };

export type Project = {
  slug: string;
  tab: ProjectTabSlug;
  title: string;
  /** The full place line in the hero. */
  location: string;
  /** The short place under the title on its tile. */
  meta: string;
  /** The campaign description, set under the title in the hero. */
  lead: string;
  /** The rest of the story, set between the pictures in the gallery. */
  story: string[];
  cover: ProjectImage;
  /** A lighter copy of the cover for the grid tile. */
  tile: { src: string; w: number; h: number };
  /** The client's mark, white, for the tile's top-left corner. w and h are CSS px (the file is 3x). */
  logo?: { src: string; w: number; h: number };
  gallery: ProjectMedia[];
  /**
   * More stills for the mosaic under the rail. Add as many as there are; the
   * layout repeats every six. Leave it out and the mosaic shows empty slots.
   */
  more?: ProjectImage[];
};

/** Empty slots shown in the mosaic until a project has its own `more` stills. Set false to hide them. */
export const MOSAIC_PLACEHOLDERS = 12;

export const projects: Project[] = [
  {
    slug: 'anne-bonny',
    tab: 'travel',
    title: 'Anne Bonny',
    location: 'Raja Ampat, West Papua, Indonesia',
    meta: 'Raja Ampat',
    lead: 'Five years of photography, film and creator campaigns, from the deck of a sailing ship.',
    story: [
      'An ongoing client relationship spanning across 5 years of partnership, including photography and film production, YouTube and Instagram management, as well as influencer marketing campaigns.',
      'Creators we have worked with on Anne Bonny include @emmettsparling, @lostleblanc, @chelseakauai, @josiahwg, @samnewton and @mikkopaasi, among others.',
    ],
    cover: { src: '/img/work/travel/anne-bonny/cover.jpg', w: 1920, h: 2400, alt: 'A green island rising from calm water at golden hour, a small sailing ship anchored below it', pos: '50% 55%' },
    tile: { src: '/img/work/travel/anne-bonny/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/travel/anne-bonny/logo.png', w: 88, h: 30 },
    gallery: [
      { type: 'image', src: '/img/work/travel/anne-bonny/01.jpg', w: 1520, h: 1900, alt: 'The ship anchored in a misty bay, three women sitting on the beach in the foreground' },
      { type: 'image', src: '/img/work/travel/anne-bonny/02.jpg', w: 1520, h: 1900, alt: 'Two people mid-flip off the bowsprit at sunset between rocky islands' },
      { type: 'image', src: '/img/work/travel/anne-bonny/03.jpg', w: 1267, h: 1900, alt: 'A crew in white lying along the bowsprit, seen from above' },
      { type: 'image', src: '/img/work/travel/anne-bonny/04.jpg', w: 1398, h: 1900, alt: 'A freediver gliding above a school of silver fish' },
      { type: 'image', src: '/img/work/travel/anne-bonny/05.jpg', w: 1342, h: 1900, alt: 'A woman standing in shallow water, the ship blurred behind her' },
      { type: 'image', src: '/img/work/travel/anne-bonny/06.jpg', w: 1900, h: 1267, alt: 'Guests sitting together on the shaded deck daybed' },
    ],
    more: [
      { src: '/img/work/travel/anne-bonny/more-01.jpg', w: 1600, h: 1029, alt: 'A man snorkelling in deep blue water with reef sharks around him' },
      { src: '/img/work/travel/anne-bonny/more-02.jpg', w: 1600, h: 899, alt: 'An aerial of a green island ringed by white sand and turquoise shallows' },
      { src: '/img/work/travel/anne-bonny/more-03.jpg', w: 1280, h: 1600, alt: 'Two people mid-flip above the ship at sunset, cliffs on either side' },
      { src: '/img/work/travel/anne-bonny/more-04.jpg', w: 1067, h: 1600, alt: 'A figure leaping off the bowsprit at dusk, the ship dark against a blue sky' },
      { src: '/img/work/travel/anne-bonny/more-05.jpg', w: 1067, h: 1600, alt: 'A crew in white lying along the bowsprit under the sails, seen from above' },
      { src: '/img/work/travel/anne-bonny/more-06.jpg', w: 1280, h: 1600, alt: 'A woman wading into calm water toward the ship, misty hills behind' },
      { src: '/img/work/travel/anne-bonny/more-07.jpg', w: 1280, h: 1600, alt: 'Three women sitting on the beach looking out at the ship in a misty bay' },
      { src: '/img/work/travel/anne-bonny/more-08.jpg', w: 1067, h: 1600, alt: 'Friends crowded on the bow of a sailing boat at sunset, arms raised' },
      { src: '/img/work/travel/anne-bonny/more-09.jpg', w: 1179, h: 1600, alt: 'A person falling past a sail against a pale misty sky' },
    ],
  },
  {
    slug: 'bhutan-peaceful-tours',
    tab: 'travel',
    title: 'Bhutan Peaceful Tours',
    location: 'Bhutan',
    meta: 'Bhutan',
    lead: 'Cultural and travel photography.',
    story: [
      'We followed the route a Bhutan Peaceful Tours guest would take: a covered wooden bridge at the start of the day, a fortress monastery above a river, and a long suspension bridge strung with prayer flags.',
      'The portraits sit beside the landscapes so the place reads through its people as much as its architecture: a monk crossing a sunlit courtyard, a guide on a ridge with the local dogs, a man resting beneath a monastery built into the cliff.',
    ],
    cover: { src: '/img/work/travel/bhutan-peaceful-tours/cover.jpg', w: 1920, h: 2400, alt: 'A white and gold monastery clinging to a cliff above a misty valley', pos: '50% 50%' },
    tile: { src: '/img/work/travel/bhutan-peaceful-tours/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/travel/bhutan-peaceful-tours/logo.png', w: 34, h: 44 },
    gallery: [
      { type: 'image', src: '/img/work/travel/bhutan-peaceful-tours/01.jpg', w: 1080, h: 607, alt: 'A fortress monastery with red roofs beside a river, seen from above' },
      { type: 'image', src: '/img/work/travel/bhutan-peaceful-tours/02.jpg', w: 1080, h: 1350, alt: 'Two walkers crossing a suspension bridge hung with prayer flags' },
      { type: 'image', src: '/img/work/travel/bhutan-peaceful-tours/03.jpg', w: 1520, h: 1900, alt: 'A man in traditional dress standing on a rock with two dogs, mountains behind' },
      { type: 'image', src: '/img/work/travel/bhutan-peaceful-tours/04.jpg', w: 1520, h: 1900, alt: 'A man sitting against a stone wall, a cliffside monastery behind him' },
      { type: 'image', src: '/img/work/travel/bhutan-peaceful-tours/05.jpg', w: 1520, h: 1900, alt: 'A monk crossing a sunlit stone courtyard' },
      { type: 'image', src: '/img/work/travel/bhutan-peaceful-tours/06.jpg', w: 1520, h: 1900, alt: 'A man resting on a ledge below a monastery built into the cliff' },
    ],
    more: [
      { src: '/img/work/travel/bhutan-peaceful-tours/more-01.jpg', w: 1600, h: 1000, alt: 'A monk in red robes walking along a covered wooden bridge' },
      { src: '/img/work/travel/bhutan-peaceful-tours/more-02.jpg', w: 1280, h: 1600, alt: 'Two monks standing in a whitewashed courtyard below a carved wooden facade' },
      { src: '/img/work/travel/bhutan-peaceful-tours/more-03.jpg', w: 1280, h: 1600, alt: 'A monk sitting on a whitewashed stone ring around a large tree in a courtyard' },
      { src: '/img/work/travel/bhutan-peaceful-tours/more-04.jpg', w: 1280, h: 1600, alt: 'A traveller sitting on a ledge stroking a dog, the cliffside monastery behind him' },
      { src: '/img/work/travel/bhutan-peaceful-tours/more-05.jpg', w: 1280, h: 1600, alt: 'A monk seated beneath a huge spreading tree in a monastery courtyard' },
    ],
  },
  {
    slug: 'nepal',
    tab: 'travel',
    title: 'Nepal',
    location: 'Nepal',
    meta: 'Nepal',
    lead: 'Cultural and travel photography collection.',
    story: [
      'The Nepal frames start in a temple hall, with three young monks seated in front of a gilded Buddha, and move out into the narrow streets, where cyclists and shopkeepers share the same cobbles.',
      'Most of the gallery is spent around the stupa, where prayer flags, flocks of pigeons and rows of butter lamps give every frame its own light. A smiling monk and a woman at prayer show a place that is lived in, not put on display.',
    ],
    cover: { src: '/img/work/travel/nepal/cover.jpg', w: 1920, h: 2400, alt: 'The golden spire of the stupa with prayer flags streaming across a blue sky', pos: '50% 35%' },
    tile: { src: '/img/work/travel/nepal/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/travel/nepal/logo.png', w: 76, h: 44 },
    gallery: [
      { type: 'image', src: '/img/work/travel/nepal/01.jpg', w: 1900, h: 1267, alt: 'A cyclist riding down a cobbled Kathmandu street' },
      { type: 'image', src: '/img/work/travel/nepal/02.jpg', w: 1520, h: 1900, alt: 'A man carrying a lamb on his shoulders among a flock of sheep' },
      { type: 'image', src: '/img/work/travel/nepal/03.jpg', w: 1520, h: 1900, alt: 'The stupa with prayer flags and birds in a blue sky' },
      { type: 'image', src: '/img/work/travel/nepal/04.jpg', w: 1900, h: 1188, alt: 'Rows of butter lamps glowing in a dark room' },
      { type: 'image', src: '/img/work/travel/nepal/05.jpg', w: 1520, h: 1900, alt: 'A woman with raised hands in front of the stupa at dusk' },
      { type: 'image', src: '/img/work/travel/nepal/06.jpg', w: 1900, h: 1267, alt: 'A smiling monk in maroon robes with pigeons and the stupa behind him' },
      { type: 'image', src: '/img/work/travel/nepal/07.jpg', w: 1520, h: 1900, alt: 'Pigeons taking off in the square beneath the stupa' },
    ],
    more: [
      { src: '/img/work/travel/nepal/more-01.jpg', w: 1600, h: 1000, alt: 'Children running through a flock of pigeons beside a temple' },
      { src: '/img/work/travel/nepal/more-02.jpg', w: 1600, h: 1067, alt: 'A woman reading by candlelight, a mirror reflecting the stupa street outside' },
      { src: '/img/work/travel/nepal/more-03.jpg', w: 1600, h: 1000, alt: 'Young monks in maroon robes standing in a street hung with prayer flags' },
      { src: '/img/work/travel/nepal/more-04.jpg', w: 1280, h: 1600, alt: 'Three young monks seated in front of a gilded Buddha' },
      { src: '/img/work/travel/nepal/more-05.jpg', w: 1280, h: 1600, alt: 'Two women sharing tea at an arched window with the stupa beyond' },
      { src: '/img/work/travel/nepal/more-06.jpg', w: 1280, h: 1600, alt: 'Two monkeys on a whitewashed stupa below a flag of prayer flags' },
      { src: '/img/work/travel/nepal/more-07.jpg', w: 1600, h: 1000, alt: 'A monk at prayer inside a candlelit temple hall' },
      { src: '/img/work/travel/nepal/more-08.jpg', w: 1600, h: 1000, alt: 'A monk in orange robes on a terrace, mountains behind him' },
      { src: '/img/work/travel/nepal/more-09.jpg', w: 1280, h: 1600, alt: 'A man in a green jacket holding a camera on a busy street' },
      { src: '/img/work/travel/nepal/more-10.jpg', w: 1280, h: 1600, alt: 'A woman in traditional dress raising her arms before the stupa, butter lamps around her' },
    ],
  },
  {
    slug: 'phinisi-armada',
    tab: 'travel',
    title: 'Phinisi Armada',
    location: 'Bulukumba, South Sulawesi, Indonesia',
    meta: 'Bulukumba',
    lead: 'An ongoing hero film, photography and social media campaign, documenting the build of a traditional phinisi vessel from start to finish.',
    story: [
      'The campaign also follows the vessel\'s attempted journey to become the first phinisi to return to Australian shores in 100+ years.',
      'Phinisi are built where they will be launched: on an open beach, under palms, with hand tools and a crew that knows the hull by heart. The gallery moves between drone views of the whole yard and close portraits of the men who work in it.',
    ],
    cover: { src: '/img/work/travel/phinisi-armada/cover.jpg', w: 1920, h: 2400, alt: 'A wooden phinisi hull under construction on a beach beside turquoise water, palms behind', pos: '50% 50%' },
    tile: { src: '/img/work/travel/phinisi-armada/tile.jpg', w: 880, h: 1100 },
    gallery: [
      { type: 'image', src: '/img/work/travel/phinisi-armada/01.jpg', w: 1520, h: 1900, alt: 'A man sitting at the foot of a staircase against the hull' },
      { type: 'image', src: '/img/work/travel/phinisi-armada/02.jpg', w: 1900, h: 1267, alt: 'Two men working on the planks inside the hull' },
      { type: 'image', src: '/img/work/travel/phinisi-armada/03.jpg', w: 1520, h: 1900, alt: 'The hull on the beach seen from the side, palms in the foreground' },
      { type: 'image', src: '/img/work/travel/phinisi-armada/04.jpg', w: 1520, h: 1900, alt: 'The beach shipyard from directly above, surf at the edge' },
      { type: 'image', src: '/img/work/travel/phinisi-armada/05.jpg', w: 1520, h: 1900, alt: 'The unfinished hull seen between tall palm trunks' },
      { type: 'image', src: '/img/work/travel/phinisi-armada/06.jpg', w: 1520, h: 1900, alt: 'The shipyard with its sheds and a hull in progress, from the air' },
    ],
    more: [
      { src: '/img/work/travel/phinisi-armada/more-01.jpg', w: 1600, h: 1067, alt: 'A shipbuilder smoking in a shaft of light inside a dark boatyard hall' },
      { src: '/img/work/travel/phinisi-armada/more-02.jpg', w: 1600, h: 1067, alt: 'A wooden hull under construction in an open-sided shed beside the sea' },
      { src: '/img/work/travel/phinisi-armada/more-03.jpg', w: 1600, h: 1067, alt: 'Two builders on scaffolding against the planked hull of a phinisi' },
      { src: '/img/work/travel/phinisi-armada/more-04.jpg', w: 1280, h: 1600, alt: 'A phinisi frame rising above palm trees beside a grey sea, seen from above' },
      { src: '/img/work/travel/phinisi-armada/more-05.jpg', w: 1600, h: 1000, alt: 'A half-built phinisi on the beach, palms and surf either side' },
    ],
  },
  {
    slug: 'wonderful-indonesia',
    tab: 'travel',
    title: 'Wonderful Indonesia',
    location: 'Indonesia',
    meta: 'Indonesia',
    lead: 'Continuous work across countless photography and film campaigns throughout the Indonesian Archipelago.',
    story: [
      'Wonderful Indonesia is the country\'s tourism brand, and these frames follow the people it invites visitors to meet: a procession walking up a jungle path, dancers in flower crowns, children carrying offerings along a village lane.',
      'Between the ceremonies sit the working landscapes: sulphur carriers at the rim of a steaming crater, terraced rice fields from the air and a fisherman wading across a still lagoon.',
    ],
    cover: { src: '/img/work/travel/wonderful-indonesia/cover.jpg', w: 1920, h: 2400, alt: 'A procession in white ceremonial dress walking up a jungle path', pos: '50% 75%' },
    tile: { src: '/img/work/travel/wonderful-indonesia/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/travel/wonderful-indonesia/logo.png', w: 88, h: 35 },
    gallery: [
      { type: 'image', src: '/img/work/travel/wonderful-indonesia/01.jpg', w: 1520, h: 1900, alt: 'Two sulphur carriers on the rim of a steaming crater above a turquoise lake' },
      { type: 'image', src: '/img/work/travel/wonderful-indonesia/02.jpg', w: 1520, h: 1900, alt: 'Terraced rice fields from above with a white-clad gathering beneath a tree' },
      { type: 'image', src: '/img/work/travel/wonderful-indonesia/03.jpg', w: 1267, h: 1900, alt: 'A young woman in a flower headdress at a ceremony' },
      { type: 'image', src: '/img/work/travel/wonderful-indonesia/04.jpg', w: 1520, h: 1900, alt: 'A small child walking down a cobbled village lane lined with banners' },
      { type: 'image', src: '/img/work/travel/wonderful-indonesia/05.jpg', w: 1900, h: 1267, alt: 'Two girls in traditional dress, one carrying an offering on her head' },
      { type: 'image', src: '/img/work/travel/wonderful-indonesia/06.jpg', w: 1520, h: 1900, alt: 'A fisherman wading through still water between wooden stilts' },
    ],
    more: [
      { src: '/img/work/travel/wonderful-indonesia/more-01.jpg', w: 1280, h: 1600, alt: 'A sulphur miner walking through thick steam with two loaded baskets' },
      { src: '/img/work/travel/wonderful-indonesia/more-02.jpg', w: 1280, h: 1600, alt: 'A miner wading in a turquoise pool among white sulphur rocks' },
      { src: '/img/work/travel/wonderful-indonesia/more-03.jpg', w: 1280, h: 1600, alt: 'A miner carrying baskets of yellow sulphur at a crater rim, a turquoise lake behind' },
      { src: '/img/work/travel/wonderful-indonesia/more-04.jpg', w: 1280, h: 1600, alt: 'Workers sorting sulphur beside wheelbarrows at the edge of a crater lake' },
      { src: '/img/work/travel/wonderful-indonesia/more-05.jpg', w: 1280, h: 1600, alt: 'A farmer standing in a rice paddy with an owl perched on his hat' },
      { src: '/img/work/travel/wonderful-indonesia/more-06.jpg', w: 1280, h: 1600, alt: 'Villagers carrying offerings under a giant banyan tree, light streaming through the branches' },
      { src: '/img/work/travel/wonderful-indonesia/more-07.jpg', w: 1280, h: 1600, alt: 'A red vintage car parked beneath a huge banyan as the sun breaks through' },
    ],
  },
  {
    slug: 'bingin-tree-tops',
    tab: 'hospitality',
    title: 'Bingin Tree Tops',
    location: 'Uluwatu, Bali, Indonesia',
    meta: 'Uluwatu, Bali',
    lead: 'A property architecture, interior and lifestyle campaign.',
    story: [
      'Bingin Tree Tops is a cluster of villas on a hillside in Uluwatu, built from white walls, dark timber and tall pitched roofs. We shot the buildings first, in clean daylight, then the rooms and pools with guests using them.',
      'The Balinese blessing ceremony is part of the story, so it is in the gallery: offerings being prepared, a short exchange in front of the Tree Top 5 sign and priests at prayer. Those frames sit among the living spaces and give the set a human rhythm.',
    ],
    cover: { src: '/img/work/hospitality/bingin-tree-tops/cover.jpg', w: 1920, h: 2400, alt: 'A woman resting beside a plunge pool on a timber deck, framed by large leaves', pos: '50% 60%' },
    tile: { src: '/img/work/hospitality/bingin-tree-tops/tile.jpg', w: 880, h: 1100 },
    gallery: [
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/01.jpg', w: 1900, h: 1187, alt: 'Villas with steep gabled roofs under a blue sky' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/02.jpg', w: 1520, h: 1900, alt: 'A villa with timber stairs and balconies, seen from the side' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/03.jpg', w: 1520, h: 1900, alt: 'Women arranging offerings in a narrow white courtyard' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/04.jpg', w: 1900, h: 1267, alt: 'Two women exchanging woven offering baskets beside the Tree Top 5 sign' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/05.jpg', w: 1267, h: 1900, alt: 'Priests in white praying behind a bed of offerings' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/06.jpg', w: 1900, h: 1267, alt: 'A woman working on a laptop on a daybed in a villa living room' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/07.jpg', w: 1520, h: 1900, alt: 'A woman sitting on a timber balcony rail among bamboo' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/08.jpg', w: 1900, h: 1267, alt: 'A woman reading on a sofa among banana leaves' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/09.jpg', w: 1900, h: 1267, alt: 'An open living area with a long timber table' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/10.jpg', w: 1900, h: 1267, alt: 'The plunge pool and deck at dusk' },
      { type: 'image', src: '/img/work/hospitality/bingin-tree-tops/11.jpg', w: 1267, h: 1900, alt: 'The pool and deck seen through leaves' },
    ],
    more: [
      { src: '/img/work/hospitality/bingin-tree-tops/more-01.jpg', w: 1600, h: 1198, alt: 'Two white villas with steep tiled roofs under a blue sky' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-02.jpg', w: 1600, h: 1000, alt: 'A carved wooden door hung with a flower offering, Tree Top 2 on the wall beside it' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-03.jpg', w: 1600, h: 900, alt: 'A courtyard plunge pool with white walls and tropical planting' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-04.jpg', w: 1280, h: 1600, alt: 'An aerial of the villas\' grey tiled roofs with the sea beyond' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-05.jpg', w: 1434, h: 1600, alt: 'The white facade of a villa with timber windows and a thatched eave, seen from below' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-06.jpg', w: 1067, h: 1600, alt: 'A woman climbing a timber staircase beside a white wall, fields behind her' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-07.jpg', w: 1600, h: 1067, alt: 'A woman sitting on a balcony rail beside the kitchen' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-08.jpg', w: 1600, h: 1067, alt: 'A villa at night, a lit pool in front and loungers on the deck' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-09.jpg', w: 1280, h: 1600, alt: 'A view from the bed through open curtains to a woman on the balcony' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-10.jpg', w: 1280, h: 1600, alt: 'Two women on loungers on the pool deck beneath a tree' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-11.jpg', w: 1280, h: 1600, alt: 'Two women relaxing in the lounge, one reading, balcony doors open behind them' },
      { src: '/img/work/hospitality/bingin-tree-tops/more-12.jpg', w: 1280, h: 1600, alt: 'A woman standing in a small plunge pool in a walled courtyard' },
    ],
  },
  {
    slug: 'desa-hay-bali',
    tab: 'hospitality',
    title: 'Desa Hay',
    location: 'Tumbak Bayuh, Bali, Indonesia',
    meta: 'Tumbak Bayuh, Bali',
    lead: 'A property architecture, interior and lifestyle photography campaign.',
    story: [
      'Desa Hay has a mood of its own: charcoal timber, thick planting and low light. We worked with that, shooting the villas, bar and pools as a place you move through slowly.',
      'Guests drift through the gallery rather than pose in it: a couple sharing wine, a bath half hidden by leaves, a long pool lined with grass and thatched bales. The mirror and bedside frames close the set on the private side of the stay.',
    ],
    cover: { src: '/img/work/hospitality/desa-hay-bali/cover.jpg', w: 1920, h: 2400, alt: 'A dark timber villa beside a plunge pool, a surfboard in hand and a guest seated nearby', pos: '50% 62%' },
    tile: { src: '/img/work/hospitality/desa-hay-bali/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/hospitality/desa-hay-bali/logo.png', w: 74, h: 48 },
    gallery: [
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/01.jpg', w: 1520, h: 1900, alt: 'A couple laughing over glasses of red wine at the bar' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/02.jpg', w: 1520, h: 1900, alt: 'A woman sitting in a stone bath surrounded by ferns' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/03.jpg', w: 1520, h: 1900, alt: 'A woman resting her chin on her hand in a bath framed by leaves' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/04.jpg', w: 1900, h: 1267, alt: 'A curved pool with grass at its edge and a pavilion behind' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/05.jpg', w: 1520, h: 1900, alt: 'A woman standing at the pool edge beside a palm trunk' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/06.jpg', w: 1520, h: 1900, alt: 'A woman walking down a stone path toward the pavilion' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/07.jpg', w: 1520, h: 1900, alt: 'A thatched bale beside the pool among palms' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/08.jpg', w: 1520, h: 1900, alt: 'A view from the bed through open curtains to a woman stretching outside' },
      { type: 'image', src: '/img/work/hospitality/desa-hay-bali/09.jpg', w: 1520, h: 1900, alt: 'A woman in a striped shirt reflected in a round mirror among palms' },
    ],
    more: [
      { src: '/img/work/hospitality/desa-hay-bali/more-01.jpg', w: 1600, h: 1067, alt: 'A woman pouring tea in an outdoor bath, framed by palm leaves' },
      { src: '/img/work/hospitality/desa-hay-bali/more-02.jpg', w: 1600, h: 1067, alt: 'A woman reading in a hanging rattan chair among tropical leaves' },
      { src: '/img/work/hospitality/desa-hay-bali/more-03.jpg', w: 1280, h: 1600, alt: 'A woman in a green dress sitting by a bath in a jungle garden with red flowers' },
      { src: '/img/work/hospitality/desa-hay-bali/more-04.jpg', w: 1280, h: 1600, alt: 'A woman among ferns in a dark bathroom that opens onto the garden' },
      { src: '/img/work/hospitality/desa-hay-bali/more-05.jpg', w: 1280, h: 1600, alt: 'A woman in a white dress leading by the hand through the garden, the pool and thatched roof behind' },
      { src: '/img/work/hospitality/desa-hay-bali/more-06.jpg', w: 1280, h: 1600, alt: 'A man at a terrace table and a woman in the pool with a cup, a hanging chair behind them' },
      { src: '/img/work/hospitality/desa-hay-bali/more-07.jpg', w: 1280, h: 1600, alt: 'A man reading in a hanging egg chair, seen through a glass door' },
      { src: '/img/work/hospitality/desa-hay-bali/more-08.jpg', w: 1280, h: 1600, alt: 'A couple lying on a bed beside the open jungle doors, a screen on the wall' },
    ],
  },
  {
    slug: 'eco-six',
    tab: 'hospitality',
    title: 'Eco Six',
    location: 'Ubud, Bali, Indonesia',
    meta: 'Ubud, Bali',
    lead: 'Property lifestyle photography.',
    story: [
      'Eco Six is built almost entirely from bamboo, and the frames lean on it: arched openings that frame the view, a woven hammock under a bamboo roof, and a balcony railing that catches the low sun.',
      'We kept the people small and the architecture large, so a guest walking toward the water through a bamboo tunnel reads as part of the place. Warm light and cool water run through the whole set.',
    ],
    cover: { src: '/img/work/hospitality/eco-six/cover.jpg', w: 1920, h: 2400, alt: 'A woman in a towel sitting on a freestanding bath in front of an arched window', pos: '50% 55%' },
    tile: { src: '/img/work/hospitality/eco-six/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/hospitality/eco-six/logo.png', w: 73, h: 44 },
    gallery: [
      { type: 'image', src: '/img/work/hospitality/eco-six/01.jpg', w: 1520, h: 1900, alt: 'A pool on a lawn beneath a tall palm in soft light' },
      { type: 'image', src: '/img/work/hospitality/eco-six/02.jpg', w: 1520, h: 1900, alt: 'A woman reading in a hammock under a bamboo roof' },
      { type: 'image', src: '/img/work/hospitality/eco-six/03.jpg', w: 1520, h: 1900, alt: 'A woman walking through a bamboo arch toward a pool' },
      { type: 'image', src: '/img/work/hospitality/eco-six/04.jpg', w: 1520, h: 1900, alt: 'A woman wading into the pool from the arch' },
      { type: 'image', src: '/img/work/hospitality/eco-six/05.jpg', w: 1520, h: 1900, alt: 'A woman at the edge of an infinity pool, seen from behind' },
      { type: 'image', src: '/img/work/hospitality/eco-six/06.jpg', w: 1900, h: 1188, alt: 'A woman with a cup of coffee on the balcony at sunset' },
    ],
  },
  {
    slug: 'hidden-hills-villas',
    tab: 'hospitality',
    title: 'Hidden Hills Villas',
    location: 'Uluwatu, Bali, Indonesia',
    meta: 'Uluwatu, Bali',
    lead: 'A three part cinematic film series, composed as a hero film campaign.',
    story: [
      'Each film follows one kind of guest through a stay at Hidden Hills Villas in Uluwatu, Bali, from the welcome at the gate to the villa lit up at night.',
      'The couple\'s film is slow and private: a floating breakfast in the pool, a sauna and a wine cellar. The family film opens with a welcome at the gate, and the solo film starts at the cliffs and the ocean and ends with a quiet night in the villa.',
    ],
    cover: { src: '/img/work/hospitality/hidden-hills-villas/cover.jpg', w: 1004, h: 1374, alt: 'A glass-walled villa bathroom with a tub of red rose petals, the jungle beyond', pos: '50% 70%' },
    tile: { src: '/img/work/hospitality/hidden-hills-villas/tile.jpg', w: 804, h: 1100 },
    logo: { src: '/img/work/hospitality/hidden-hills-villas/logo.png', w: 96, h: 35 },
    gallery: [
      { type: 'video', title: 'Solo', src: media('hidden-hills-solo.mp4'), srcSm: media('hidden-hills-solo-sm.mp4'), poster: '/video/work/hidden-hills-solo.jpg', w: 1280, h: 640, alt: 'A solo traveller at Hidden Hills Villas: breakfast in bed' },
      { type: 'video', title: 'Couple', src: media('hidden-hills-couple.mp4'), srcSm: media('hidden-hills-couple-sm.mp4'), poster: '/video/work/hidden-hills-couple.jpg', w: 1280, h: 640, alt: 'A couple at Hidden Hills Villas: a floating breakfast in the pool' },
      { type: 'video', title: 'Family', src: media('hidden-hills-family.mp4'), srcSm: media('hidden-hills-family-sm.mp4'), poster: '/video/work/hidden-hills-family.jpg', w: 1280, h: 640, alt: 'A family at Hidden Hills Villas: the welcome at the gate' },
    ],
  },
  {
    slug: 'marriott-bonvoy',
    tab: 'hospitality',
    title: 'Marriott Bonvoy',
    location: 'Vietnam',
    meta: 'Vietnam',
    lead: 'A full film and photography campaign covering property, lifestyle and tourism experiences across top Marriott resorts in Phu Quoc, Nha Trang and Da Nang.',
    story: [
      'The series follows travellers through Vietnam by day and by night: cycling through a lantern-lit old town, watching the sun go down from a glass platform over the sea, and riding a round basket boat through the water palms.',
      'Local work is part of the story too. Salt carriers cross the flats at sunset and toss salt into the light, and the trip ends at a night market, with plates of seafood under the lights of the stalls.',
    ],
    cover: { src: '/img/work/hospitality/marriott-bonvoy/cover.jpg', w: 1080, h: 1350, alt: 'Red incense sticks laid out in a heart of yellow, seen from above', pos: '50% 25%' },
    tile: { src: '/img/work/hospitality/marriott-bonvoy/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/hospitality/marriott-bonvoy/logo.png', w: 88, h: 27 },
    gallery: [
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/01.jpg', w: 1080, h: 720, alt: 'A couple laughing together on a waterfront with a colourful hillside town behind' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/02.jpg', w: 1080, h: 720, alt: 'A couple watching the sunset from a glass viewing platform over the sea' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/03.jpg', w: 1080, h: 720, alt: 'Salt carriers silhouetted against an orange sky and its reflection' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/04.jpg', w: 1080, h: 1350, alt: 'A worker tipping salt from baskets into the light' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/05.jpg', w: 1080, h: 1350, alt: 'Two friends walking out of a themed park gate carved from rock' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/06.jpg', w: 900, h: 1350, alt: 'Two women in traditional dress walking down steps below a large white Buddha' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/07.jpg', w: 1080, h: 675, alt: 'A man walking between stone animal statues at a cave temple' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/08.jpg', w: 1080, h: 720, alt: 'A couple riding in a round basket boat with a rower in a conical hat' },
      { type: 'image', src: '/img/work/hospitality/marriott-bonvoy/09.jpg', w: 1080, h: 720, alt: 'A couple choosing seafood at a night market stall' },
    ],
    more: [
      { src: '/img/work/hospitality/marriott-bonvoy/more-01.jpg', w: 1080, h: 720, alt: 'Two men sitting on a street under hung calligraphy at night, a lamp lighting the pages' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-02.jpg', w: 1080, h: 675, alt: 'A woman walking beside a canal of old yellow buildings, a woman in a conical hat seated in front' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-03.jpg', w: 1080, h: 720, alt: 'A couple at a table of tea and cakes in an ornate pink room, a server beside them' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-04.jpg', w: 900, h: 1350, alt: 'A woman sitting in a doorway hung with colourful lanterns' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-05.jpg', w: 1080, h: 1350, alt: 'A street lined with pink bougainvillea and green lanterns, a lone motorbike ahead' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-06.jpg', w: 1080, h: 1350, alt: 'A couple walking past rows of large clay jars' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-07.jpg', w: 1080, h: 720, alt: 'Three people in a round basket boat among water palms' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-08.jpg', w: 1080, h: 1350, alt: 'Brick temple ruins among green hills' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-09.jpg', w: 1080, h: 1350, alt: 'Two women laughing in a cyclo on a sunny street' },
      { src: '/img/work/hospitality/marriott-bonvoy/more-10.jpg', w: 900, h: 1350, alt: 'A couple on a sofa in a pink room, seen through a round blur' },
    ],
  },
  {
    slug: 'cocosolis',
    tab: 'products',
    title: 'Cocosolis',
    location: 'Raja Ampat, West Papua, Indonesia',
    meta: 'Raja Ampat and Bali',
    lead: 'Product film shoots in both Raja Ampat and Bali, Indonesia.',
    story: [
      'Four films for an organic tanning range, set on the deck of a sailing ship, in a green lagoon, on a pale beach and on a villa terrace.',
      'Each film is a short, self-contained piece with the Cocosolis mark at the close.',
    ],
    cover: { src: '/img/work/products/cocosolis/cover.jpg', w: 2400, h: 1350, alt: 'A woman holding a Cocosolis bottle to her neck in a green lagoon', pos: '72% 50%' },
    tile: { src: '/img/work/products/cocosolis/tile.jpg', w: 2000, h: 1125 },
    logo: { src: '/img/work/products/cocosolis/logo.png', w: 104, h: 41 },
    gallery: [
      { type: 'video', title: 'Aboard', src: media('cocosolis-1.mp4'), srcSm: media('cocosolis-1-sm.mp4'), poster: '/video/work/cocosolis-1.jpg', w: 1920, h: 1080, alt: 'Cocosolis bottles on the deck of a sailing ship' },
      { type: 'video', title: 'Island', src: media('cocosolis-3.mp4'), srcSm: media('cocosolis-3-sm.mp4'), poster: '/video/work/cocosolis-3.jpg', w: 1920, h: 1080, alt: 'Cocosolis in a green island lagoon' },
      { type: 'video', title: 'The beach', src: media('cocosolis-4.mp4'), srcSm: media('cocosolis-4-sm.mp4'), poster: '/video/work/cocosolis-4.jpg', w: 1920, h: 1080, alt: 'Cocosolis on a beach with a sailing ship offshore' },
      { type: 'video', title: 'Villa terrace', src: media('cocosolis-peach-capri-bag.mp4'), srcSm: media('cocosolis-peach-capri-bag-sm.mp4'), poster: '/video/work/cocosolis-peach-capri-bag.jpg', w: 1920, h: 1080, alt: 'Two women on a villa terrace with a striped bag' },
    ],
  },
  {
    slug: 'find-your-asri',
    tab: 'products',
    title: 'Find Your Asri',
    location: 'Bali, Indonesia',
    meta: 'Bali',
    lead: 'A boutique luxury camera accessories brand, founded by our Production Director, Cam Vaughne.',
    story: [
      '“Find Your Asri” began as a boutique luxury camera accessories brand, founded by our current Production Director, Cam Vaughne. Every piece was made by local artisans from their own homes, telling unique stories about the island in which they were handcrafted, with 20% of every sale supporting local people and communities in need.',
      'From the products themselves to the brand identity, creative direction, photography, filmmaking, and marketing, the brand was built, independently, from the ground up. That experience became the foundation of Find Your Asri today: turning ideas into distinctive brands, developing their visual identity, and telling the unique stories that bring them to life.',
    ],
    cover: { src: '/img/work/products/find-your-asri/cover.jpg', w: 2400, h: 1500, alt: 'A photographer in a dark jacket raising his camera on a hillside, a lake and mountains behind', pos: '75% 40%' },
    tile: { src: '/img/work/products/find-your-asri/tile.jpg', w: 1760, h: 1100 },
    logo: { src: '/img/work/products/find-your-asri/logo.png', w: 104, h: 28 },
    gallery: [
      { type: 'image', src: '/img/work/products/find-your-asri/01.jpg', w: 1520, h: 1900, alt: 'An open kraft box with three leather straps in navy, mint and sand' },
      { type: 'image', src: '/img/work/products/find-your-asri/02.jpg', w: 1520, h: 1900, alt: 'Three leather straps in navy, mint and sand, side by side' },
      { type: 'image', src: '/img/work/products/find-your-asri/03.jpg', w: 1520, h: 1900, alt: 'A cotton pouch printed with the Asri name on pale sand' },
      { type: 'image', src: '/img/work/products/find-your-asri/04.jpg', w: 1900, h: 1267, alt: 'Three straps with pressed wave patterns laid on weathered timber' },
      { type: 'image', src: '/img/work/products/find-your-asri/05.jpg', w: 1520, h: 1900, alt: 'Two tan straps hanging against dark stone' },
      { type: 'image', src: '/img/work/products/find-your-asri/06.jpg', w: 1900, h: 1188, alt: 'A tan strap with an embossed dragon design on a stone floor' },
      { type: 'image', src: '/img/work/products/find-your-asri/07.jpg', w: 1520, h: 1900, alt: 'A man in a sarong sitting on temple steps with a camera on a strap' },
    ],
    more: [
      { src: '/img/work/products/find-your-asri/more-01.jpg', w: 1600, h: 1067, alt: 'A craftsman working a metal strap plate at a cluttered bench' },
      { src: '/img/work/products/find-your-asri/more-02.jpg', w: 1600, h: 1067, alt: 'A silversmith hand-working a metal piece, seen close' },
      { src: '/img/work/products/find-your-asri/more-03.jpg', w: 1600, h: 1067, alt: 'Three men smiling in the metalwork workshop' },
      { src: '/img/work/products/find-your-asri/more-04.jpg', w: 1280, h: 1600, alt: 'A man in a white shirt and sarong sitting at a temple, holding up a camera strap' },
      { src: '/img/work/products/find-your-asri/more-05.jpg', w: 1280, h: 1600, alt: 'A hand holding a camera with a long lens on its strap, a green path behind' },
      { src: '/img/work/products/find-your-asri/more-06.jpg', w: 1280, h: 1600, alt: 'A hand gripping a grey camera strap over a linen shirt' },
      { src: '/img/work/products/find-your-asri/more-07.jpg', w: 1600, h: 1067, alt: 'A woman photographing a mountain across a dry field' },
      { src: '/img/work/products/find-your-asri/more-08.jpg', w: 1600, h: 1000, alt: 'A woman in a patterned robe holding a camera, the sea behind her' },
      { src: '/img/work/products/find-your-asri/more-09.jpg', w: 1600, h: 1067, alt: 'A film camera and tan strap on a table beside a ginger cat' },
      { src: '/img/work/products/find-your-asri/more-10.jpg', w: 1280, h: 1600, alt: 'A man from behind with a camera strap across his back, in garden light' },
      { src: '/img/work/products/find-your-asri/more-11.jpg', w: 1280, h: 1600, alt: 'A hand on a leather messenger bag clipped to a motorbike' },
      { src: '/img/work/products/find-your-asri/more-12.jpg', w: 1280, h: 1600, alt: 'A woman looking down at her camera above the sea' },
      { src: '/img/work/products/find-your-asri/more-13.jpg', w: 1600, h: 1000, alt: 'A man photographing a volcano over rice fields' },
      { src: '/img/work/products/find-your-asri/more-14.jpg', w: 1280, h: 1600, alt: 'A smiling woman holding a camera on a mint strap, the sea behind her' },
      { src: '/img/work/products/find-your-asri/more-15.jpg', w: 1280, h: 1600, alt: 'A film camera and pink leather strap on a wooden shelf' },
      { src: '/img/work/products/find-your-asri/more-16.jpg', w: 1067, h: 1600, alt: 'A man in a traditional headcloth holding a medium-format camera' },
      { src: '/img/work/products/find-your-asri/more-17.jpg', w: 800, h: 1000, alt: 'A man in white sitting cross-legged at a carved temple gate, a camera strap across his chest' },
    ],
  },
  {
    slug: 'flanagan-surfboards',
    tab: 'products',
    title: 'Flanagan Surfboards',
    location: 'Bali, Indonesia',
    meta: 'Bali',
    lead: 'A photography collection and bio for world renowned surfboard shaper Jason Flanagan.',
    story: [
      'Flanagan Surfboards are made by hand in a small room, with sanding blocks, tape and a lot of patience. We spent the day there with the shaper as he worked on a single board.',
      'The set stays close: hands on the rail, tape pulled off the nose, a signature in pencil on the blank. The last frame stands in the doorway, with racks of boards waiting behind him.',
    ],
    cover: { src: '/img/work/products/flanagan-surfboards/cover.jpg', w: 1920, h: 2400, alt: 'A hand marking a line on a white surfboard against a bright blue wall', pos: '50% 65%' },
    tile: { src: '/img/work/products/flanagan-surfboards/tile.jpg', w: 880, h: 1100 },
    logo: { src: '/img/work/products/flanagan-surfboards/logo.png', w: 40, h: 44 },
    gallery: [
      { type: 'image', src: '/img/work/products/flanagan-surfboards/01.jpg', w: 1520, h: 1900, alt: 'The shaper lifting a board onto its stand' },
      { type: 'image', src: '/img/work/products/flanagan-surfboards/02.jpg', w: 1900, h: 1187, alt: 'Tape being peeled from the nose of a board' },
      { type: 'image', src: '/img/work/products/flanagan-surfboards/03.jpg', w: 1520, h: 1900, alt: 'The shaper looking through the frame of a board stand' },
      { type: 'image', src: '/img/work/products/flanagan-surfboards/04.jpg', w: 1900, h: 1267, alt: 'A signature in pencil on a board\'s blank' },
      { type: 'image', src: '/img/work/products/flanagan-surfboards/05.jpg', w: 1900, h: 1267, alt: 'The shaper in the doorway with racks of boards stacked beside him' },
    ],
  },
  {
    slug: 'next-stop',
    tab: 'products',
    title: 'Next Stop',
    location: 'Bali, Indonesia',
    meta: 'Bali',
    lead: 'A product lifestyle photoshoot.',
    story: [
      'Next Stop makes travel gear, and the shoot took one flexible black bottle into the jungle: on a mossy rock, held under a waterfall, and in the hands of a hiker who has just walked in.',
      'Dark, wet and green, the frames lean into the weather. Droplets stay on the pouch, the palette stays deep green and black, and the product is always where you would want to reach for it.',
    ],
    cover: { src: '/img/work/products/next-stop/cover.jpg', w: 1920, h: 2400, alt: 'A black Next Stop bottle standing on a mossy rock beside a waterfall', pos: '50% 62%' },
    tile: { src: '/img/work/products/next-stop/tile.jpg', w: 880, h: 1100 },
    gallery: [
      { type: 'image', src: '/img/work/products/next-stop/01.jpg', w: 1520, h: 1900, alt: 'A woman in a green hoodie peeking through large leaves' },
      { type: 'image', src: '/img/work/products/next-stop/02.jpg', w: 1520, h: 1900, alt: 'A hiker with a backpack looking at a waterfall from a wooden railing' },
      { type: 'image', src: '/img/work/products/next-stop/03.jpg', w: 1520, h: 1900, alt: 'A hand holding the bottle under falling water' },
      { type: 'image', src: '/img/work/products/next-stop/04.jpg', w: 1900, h: 1267, alt: 'A woman drinking from the bottle, wet hair and eyes closed' },
      { type: 'image', src: '/img/work/products/next-stop/05.jpg', w: 1520, h: 1900, alt: 'The bottle standing in a stream among green leaves' },
    ],
    more: [
      { src: '/img/work/products/next-stop/more-01.jpg', w: 1280, h: 1600, alt: 'A woman crouching on a rock in front of a huge waterfall, looking up' },
      { src: '/img/work/products/next-stop/more-02.jpg', w: 1280, h: 1600, alt: 'A woman in a green sweatshirt sitting cross-legged on a rock, face hidden in her collar, the falls behind her' },
      { src: '/img/work/products/next-stop/more-03.jpg', w: 1280, h: 1600, alt: 'A woman walking toward a tall waterfall over wet rocks, seen from behind' },
      { src: '/img/work/products/next-stop/more-04.jpg', w: 1280, h: 1600, alt: 'A woman in a cap and green sweatshirt, hands on her head, among rocks below a waterfall' },
      { src: '/img/work/products/next-stop/more-05.jpg', w: 1280, h: 1600, alt: 'A hand holding a black NxTSTOP pouch beside a bare foot on mossy rock' },
    ],
  },
  {
    slug: 'san-marzano-wine',
    tab: 'products',
    title: 'San Marzano Wines',
    location: 'Komodo, East Nusa Tenggara, Indonesia',
    meta: 'Komodo',
    lead: 'A five day film and photography marketing event, launching San Marzano\'s new limited edition rosé on the pink sand beaches of Komodo National Park.',
    story: [
      'San Marzano Wine took its bottles to sea: a toast on a ship at dusk, a day on a pink-sand beach and a beach table set for dinner with sailing ships anchored offshore.',
      'As the light drops the colour changes from soft gold to magenta, and the bottles themselves are lit up and held above the crowd. The last frames stay close on the glass and the pour.',
    ],
    cover: { src: '/img/work/products/san-marzano-wine/cover.jpg', w: 1600, h: 2400, alt: 'A bottle of rosé lying in sparkling water among chunks of ice', pos: '50% 50%' },
    tile: { src: '/img/work/products/san-marzano-wine/tile.jpg', w: 733, h: 1100 },
    logo: { src: '/img/work/products/san-marzano-wine/logo.png', w: 88, h: 38 },
    gallery: [
      { type: 'image', src: '/img/work/products/san-marzano-wine/01.jpg', w: 1900, h: 1267, alt: 'A man lying on a pink-sand beach beside a bottle, the sea behind him' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/02.jpg', w: 1267, h: 1900, alt: 'A hand holding a bottle in the surf on pink sand' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/03.jpg', w: 1900, h: 1267, alt: 'A DJ in purple smoke and laser light, guests in silhouette and tasselled umbrellas around him' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/04.jpg', w: 1900, h: 1267, alt: 'A woman in silhouette sipping a glass of rosé at sunset, ships anchored on the horizon' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/05.jpg', w: 1900, h: 1069, alt: 'An aerial of five phinisi under sail on deep blue water, two of them under red sails' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/06.jpg', w: 1900, h: 1267, alt: 'Guests holding up lit bottles in magenta light' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/07.jpg', w: 1900, h: 1267, alt: 'Two lit bottles in close-up' },
      { type: 'image', src: '/img/work/products/san-marzano-wine/08.jpg', w: 1900, h: 1267, alt: 'Wine being poured into a glass against the sunset' },
    ],
    more: [
      { src: '/img/work/products/san-marzano-wine/more-01.jpg', w: 1600, h: 899, alt: 'A beach dinner and DJ set at dusk, ships anchored offshore' },
      { src: '/img/work/products/san-marzano-wine/more-02.jpg', w: 1600, h: 899, alt: 'An aerial of phinisi anchored in a bay at sunset' },
      { src: '/img/work/products/san-marzano-wine/more-03.jpg', w: 1600, h: 1067, alt: 'A rosé bottle standing in a splash of surf' },
      { src: '/img/work/products/san-marzano-wine/more-04.jpg', w: 1107, h: 1600, alt: 'The sun setting over the sea, ships in silhouette on the golden reflection' },
      { src: '/img/work/products/san-marzano-wine/more-05.jpg', w: 1067, h: 1600, alt: 'A bottle upright in the shallows, water breaking around it' },
      { src: '/img/work/products/san-marzano-wine/more-06.jpg', w: 1067, h: 1600, alt: 'A man holding a bottle up on a pink-sand beach' },
      { src: '/img/work/products/san-marzano-wine/more-07.jpg', w: 1600, h: 1067, alt: 'Guests at a long table under an awning on deck' },
      { src: '/img/work/products/san-marzano-wine/more-08.jpg', w: 1600, h: 1067, alt: 'Two people holding glasses at the ship\'s rail at dusk' },
      { src: '/img/work/products/san-marzano-wine/more-09.jpg', w: 1600, h: 1067, alt: 'A man leaning in to a glowing bottle in magenta light' },
      { src: '/img/work/products/san-marzano-wine/more-10.jpg', w: 1067, h: 1600, alt: 'A man on the beach holding a bottle and a snorkel' },
      { src: '/img/work/products/san-marzano-wine/more-11.jpg', w: 1600, h: 1067, alt: 'Lit bottles held up in purple and pink light' },
    ],
  },
];

export function projectHref(project: Pick<Project, 'tab' | 'slug'>) {
  return `/work/production/${project.tab}/${project.slug}/`;
}

export function projectsFor(tab: ProjectTabSlug) {
  return projects.filter((p) => p.tab === tab);
}

export function getProject(tab: string, slug: string) {
  return projects.find((p) => p.tab === tab && p.slug === slug);
}
