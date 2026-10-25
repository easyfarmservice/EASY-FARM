/**
 * Vegetable Image Mapping Utility
 * Ensures every product always resolves to a crisp, authentic photograph.
 */

const VEGETABLE_IMAGE_MAP: Record<string, string> = {
  // Solanaceae & Gourds
  tomato: '/images/vegetables/tomato.jpg',
  'country-tomato': '/images/vegetables/tomato.jpg',
  brinjal: '/images/vegetables/brinjal.jpg',
  'purple-brinjal': '/images/vegetables/brinjal.jpg',
  eggplant: '/images/vegetables/brinjal.jpg',
  chilli: '/images/vegetables/green-chilli.jpg',
  'green-chilli': '/images/vegetables/green-chilli.jpg',
  mirchi: '/images/vegetables/green-chilli.jpg',
  capsicum: '/images/vegetables/capsicum.jpg',
  'bell-pepper': '/images/vegetables/capsicum.jpg',
  cucumber: '/images/vegetables/cucumber.jpg',
  keera: '/images/vegetables/cucumber.jpg',
  'bottle-gourd': '/images/vegetables/bottle-gourd.jpg',
  sorakaya: '/images/vegetables/bottle-gourd.jpg',
  lauki: '/images/vegetables/bottle-gourd.jpg',
  'ridge-gourd': '/images/vegetables/ridge-gourd.jpg',
  beerakaya: '/images/vegetables/ridge-gourd.jpg',
  turai: '/images/vegetables/ridge-gourd.jpg',
  zucchini: '/images/vegetables/zucchini.jpg',

  // Roots & Bulbs
  potato: '/images/vegetables/potato.jpg',
  aloo: '/images/vegetables/potato.jpg',
  onion: '/images/vegetables/onion.jpg',
  'red-onion': '/images/vegetables/onion.jpg',
  pyaz: '/images/vegetables/onion.jpg',
  carrot: '/images/vegetables/carrot.jpg',
  'organic-carrot': '/images/vegetables/carrot.jpg',
  gajar: '/images/vegetables/carrot.jpg',
  beetroot: '/images/vegetables/beetroot.jpg',

  // Pods & Legumes
  beans: '/images/vegetables/beans.jpg',
  'cluster-beans': '/images/vegetables/beans.jpg',
  gwar: '/images/vegetables/beans.jpg',
  'green-beans': '/images/vegetables/beans.jpg',
  bhindi: '/images/vegetables/bhindi.jpg',
  'lady-finger': '/images/vegetables/bhindi.jpg',
  okra: '/images/vegetables/bhindi.jpg',
  'green-peas': '/images/vegetables/green-peas.jpg',
  peas: '/images/vegetables/green-peas.jpg',
  matar: '/images/vegetables/green-peas.jpg',

  // Leafy Greens & Herbs
  palak: '/images/vegetables/palak.jpg',
  spinach: '/images/vegetables/palak.jpg',
  'fresh-palak': '/images/vegetables/palak.jpg',
  thotakura: '/images/vegetables/thotakura.jpg',
  amaranth: '/images/vegetables/thotakura.jpg',
  coriander: '/images/vegetables/coriander.jpg',
  'coriander-leaves': '/images/vegetables/coriander.jpg',
  kotmir: '/images/vegetables/coriander.jpg',
  curry: '/images/vegetables/curry-leaves.jpg',
  'curry-leaves': '/images/vegetables/curry-leaves.jpg',
  karivepaku: '/images/vegetables/curry-leaves.jpg',

  // Specialty & Exotics
  broccoli: '/images/vegetables/broccoli.jpg',
  cauliflower: '/images/vegetables/cauliflower.jpg',
  gobi: '/images/vegetables/cauliflower.jpg',
  'sweet-corn': '/images/vegetables/sweet-corn.jpg',
  corn: '/images/vegetables/sweet-corn.jpg',
  'baby-corn': '/images/vegetables/baby-corn.jpg',
  mushroom: '/images/vegetables/mushroom.jpg',
  'button-mushroom': '/images/vegetables/mushroom.jpg',
};

/**
 * Resolves an authentic, working image URL for a vegetable product.
 */
export function getVegetableImageUrl(
  rawUrl?: string | null,
  slugOrName?: string | null
): string {
  // If we already have a valid local or remote URL that isn't the generic hero placeholder
  if (rawUrl && rawUrl !== '/images/hero-vegetables.png' && rawUrl.trim() !== '') {
    return rawUrl;
  }

  if (!slugOrName) {
    return '/images/vegetables/tomato.jpg';
  }

  const query = slugOrName.toLowerCase().replace(/[^a-z0-9]/g, ' ');

  // Direct exact key check
  const simpleKey = slugOrName.toLowerCase().trim();
  if (VEGETABLE_IMAGE_MAP[simpleKey]) {
    return VEGETABLE_IMAGE_MAP[simpleKey];
  }

  // Token search
  for (const [key, path] of Object.entries(VEGETABLE_IMAGE_MAP)) {
    if (query.includes(key)) {
      return path;
    }
  }

  return '/images/vegetables/tomato.jpg';
}
