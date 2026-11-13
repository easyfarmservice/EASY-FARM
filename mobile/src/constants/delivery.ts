/**
 * Easy Farm Native Mobile Delivery Constants
 * Corresponds to the active Uppal – Ghatkesar growth corridor.
 */

export const ZONE_CENTER = {
  lat: 17.4475,
  lng: 78.6590,
  radiusKm: 12,
};

export const SERVICEABLE_PINCODES = [
  '500088', // Pocharam, Singapore Township, Sanskruti, Infosys SEZ
  '501301', // Ghatkesar, Kondapur, Yamnampet, Aushapur, Annojiguda
  '500098', // Narapally, Korremula, Chowdariguda, Venkatadri Nagar
  '500039', // Boduppal, Mallapur
  '500092', // Peerzadiguda, Medipally, Parvathapur
  '501401', // Rampally, Nagaram
];

export interface CommunityLandmark {
  name: string;
  pincode: string;
  area: string;
  lat: number;
  lng: number;
  type?: 'township' | 'apartment' | 'locality' | 'corridor';
}

export const SERVICEABLE_COMMUNITIES: CommunityLandmark[] = [
  { name: 'Singapore Township', pincode: '500088', area: 'Pocharam', lat: 17.4475, lng: 78.6534, type: 'township' },
  { name: 'Sanskruti Township', pincode: '500088', area: 'Pocharam', lat: 17.4468, lng: 78.6540, type: 'township' },
  { name: 'Emerald Heights', pincode: '500088', area: 'Pocharam', lat: 17.4520, lng: 78.6650, type: 'apartment' },
  { name: 'Pocharam IT Corridor', pincode: '500088', area: 'Pocharam', lat: 17.4540, lng: 78.6600, type: 'locality' },
  { name: 'Narapally', pincode: '500098', area: 'Narapally Corridor', lat: 17.4190, lng: 78.6250, type: 'locality' },
  { name: 'Korremula', pincode: '500098', area: 'Ghatkesar mandal', lat: 17.4300, lng: 78.6380, type: 'locality' },
  { name: 'Chowdariguda', pincode: '500098', area: 'Narapally', lat: 17.4120, lng: 78.6300, type: 'locality' },
  { name: 'Rajeev Gruha Kalpa', pincode: '501301', area: 'Ghatkesar', lat: 17.4296638, lng: 78.6696088, type: 'township' },
  { name: 'Modi Emerald Park', pincode: '501301', area: 'Ghatkesar', lat: 17.4410, lng: 78.6750, type: 'apartment' },
  { name: 'Ghatkesar Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4436, lng: 78.6823, type: 'locality' },
  { name: 'Yamnampet', pincode: '501301', area: 'Ghatkesar', lat: 17.4620, lng: 78.6700, type: 'locality' },
  { name: 'Aushapur', pincode: '501301', area: 'Ghatkesar', lat: 17.4640, lng: 78.7100, type: 'locality' },
  { name: 'Sri Aditya Homes', pincode: '501301', area: 'Ghatkesar', lat: 17.4380, lng: 78.6810, type: 'apartment' },
  { name: 'Peerzadiguda / Medipally', pincode: '500092', area: 'Medipally Corridor', lat: 17.4080, lng: 78.6050, type: 'locality' },
  { name: 'Boduppal', pincode: '500039', area: 'Boduppal Corridor', lat: 17.4140, lng: 78.5860, type: 'locality' },
  { name: 'Rampally', pincode: '501401', area: 'Keesara / Pocharam North', lat: 17.4780, lng: 78.6350, type: 'locality' },
  { name: 'Uppal Junction', pincode: '500039', area: 'Uppal', lat: 17.4020, lng: 78.5600, type: 'locality' },
];

export function getNearestCommunity(lat: number, lng: number) {
  let closest = SERVICEABLE_COMMUNITIES[0];
  let minDistance = Infinity;

  for (const c of SERVICEABLE_COMMUNITIES) {
    const dLat = c.lat - lat;
    const dLng = c.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = c;
    }
  }

  // Roughly within ~3km
  const isClose = minDistance < 0.0008;
  return { community: closest, isClose };
}

export function getNextDeliverySunday(): {
  date: Date;
  dateString: string;
  isoString: string;
  cutoffString: string;
} {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  let daysUntilSunday = (7 - dayOfWeek) % 7;

  // Saturday 11:59 PM cut-off
  if (dayOfWeek === 6) {
    // If it's Saturday, coming Sunday is in 1 day
    daysUntilSunday = 1;
  } else if (dayOfWeek === 0) {
    // If it's already Sunday, delivery was for today or next Sunday
    daysUntilSunday = 7;
  }

  const deliveryDate = new Date(now);
  deliveryDate.setDate(now.getDate() + daysUntilSunday);
  deliveryDate.setHours(7, 0, 0, 0);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  return {
    date: deliveryDate,
    dateString: deliveryDate.toLocaleDateString('en-IN', options),
    isoString: deliveryDate.toISOString().split('T')[0],
    cutoffString: 'Saturday 11:59 PM',
  };
}


