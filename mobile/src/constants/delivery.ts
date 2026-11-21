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
  // ── Pocharam & Singapore Township Corridor (PIN: 500088) ──
  { name: 'Singapore Township Sector 1', pincode: '500088', area: 'Pocharam', lat: 17.4475, lng: 78.6534, type: 'township' },
  { name: 'Singapore Township Sector 2', pincode: '500088', area: 'Pocharam', lat: 17.4485, lng: 78.6520, type: 'township' },
  { name: 'Singapore Township Sector 3', pincode: '500088', area: 'Pocharam', lat: 17.4460, lng: 78.6545, type: 'township' },
  { name: 'Sanskruti Township', pincode: '500088', area: 'Pocharam', lat: 17.4468, lng: 78.6540, type: 'township' },
  { name: 'Sanskruti Global School Road', pincode: '500088', area: 'Pocharam', lat: 17.4455, lng: 78.6550, type: 'locality' },
  { name: 'Modi Emerald Heights Phase 1', pincode: '500088', area: 'Pocharam', lat: 17.4520, lng: 78.6650, type: 'apartment' },
  { name: 'Modi Emerald Heights Phase 2', pincode: '500088', area: 'Pocharam', lat: 17.4535, lng: 78.6660, type: 'apartment' },
  { name: 'Raheja Mindspace IT Park', pincode: '500088', area: 'Pocharam', lat: 17.4510, lng: 78.6580, type: 'locality' },
  { name: 'Infosys SEZ Campus Gate 1', pincode: '500088', area: 'Pocharam', lat: 17.4540, lng: 78.6600, type: 'locality' },
  { name: 'Infosys SEZ Campus Gate 2', pincode: '500088', area: 'Pocharam', lat: 17.4570, lng: 78.6620, type: 'locality' },
  { name: 'Pocharam Village Main Road', pincode: '500088', area: 'Pocharam', lat: 17.4560, lng: 78.6530, type: 'locality' },
  { name: 'Sree Vensai Meadows', pincode: '500088', area: 'Pocharam', lat: 17.4490, lng: 78.6490, type: 'apartment' },
  { name: 'NSR Green Meadows', pincode: '500088', area: 'Pocharam', lat: 17.4440, lng: 78.6510, type: 'apartment' },

  // ── Annojiguda Corridor (PIN: 501301 / 500088) ──
  { name: 'Annojiguda ORR Junction', pincode: '501301', area: 'Annojiguda', lat: 17.4380, lng: 78.6590, type: 'locality' },
  { name: 'Annojiguda Village', pincode: '501301', area: 'Annojiguda', lat: 17.4350, lng: 78.6570, type: 'locality' },
  { name: 'Annojiguda Residential Enclave', pincode: '501301', area: 'Annojiguda', lat: 17.4330, lng: 78.6585, type: 'apartment' },

  // ── Narapally & Korremula Corridor (PIN: 500098) ──
  { name: 'Narapally Main Junction', pincode: '500098', area: 'Narapally', lat: 17.4190, lng: 78.6250, type: 'locality' },
  { name: 'Vignan Institute & Hills', pincode: '500098', area: 'Narapally', lat: 17.4160, lng: 78.6280, type: 'locality' },
  { name: 'Venkatadri Nagar', pincode: '500098', area: 'Narapally', lat: 17.4220, lng: 78.6240, type: 'locality' },
  { name: 'Chowdariguda Village', pincode: '500098', area: 'Narapally', lat: 17.4120, lng: 78.6300, type: 'locality' },
  { name: 'Korremula Road', pincode: '500098', area: 'Ghatkesar mandal', lat: 17.4300, lng: 78.6380, type: 'locality' },
  { name: 'Korremula Gram Panchayat', pincode: '500098', area: 'Ghatkesar mandal', lat: 17.4320, lng: 78.6410, type: 'locality' },

  // ── Ghatkesar & Yamnampet Corridor (PIN: 501301) ──
  { name: 'Modi Emerald Park Villas', pincode: '501301', area: 'Ghatkesar', lat: 17.4410, lng: 78.6750, type: 'apartment' },
  { name: 'Rajeev Gruha Kalpa', pincode: '501301', area: 'Ghatkesar', lat: 17.4296638, lng: 78.6696088, type: 'township' },
  { name: 'Sri Aditya Homes', pincode: '501301', area: 'Ghatkesar', lat: 17.4380, lng: 78.6810, type: 'apartment' },
  { name: 'Aditya Enclave', pincode: '501301', area: 'Ghatkesar', lat: 17.4390, lng: 78.6825, type: 'apartment' },
  { name: 'Ghatkesar Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4436, lng: 78.6823, type: 'locality' },
  { name: 'Ghatkesar Railway Station Area', pincode: '501301', area: 'Ghatkesar', lat: 17.4460, lng: 78.6840, type: 'locality' },
  { name: 'Ghatkesar Bus Depot', pincode: '501301', area: 'Ghatkesar', lat: 17.4420, lng: 78.6810, type: 'locality' },
  { name: 'Yamnampet Village', pincode: '501301', area: 'Ghatkesar', lat: 17.4620, lng: 78.6700, type: 'locality' },
  { name: 'Aushapur Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4640, lng: 78.7100, type: 'locality' },
  { name: 'VBIT College Campus Road', pincode: '501301', area: 'Aushapur', lat: 17.4610, lng: 78.7050, type: 'locality' },

  // ── Extended Corridor (Peerzadiguda, Medipally, Boduppal, Rampally, Uppal) ──
  { name: 'Peerzadiguda Municipal Office', pincode: '500092', area: 'Medipally Corridor', lat: 17.4080, lng: 78.6050, type: 'locality' },
  { name: 'Medipally Warangal Highway', pincode: '500092', area: 'Medipally Corridor', lat: 17.4050, lng: 78.6120, type: 'locality' },
  { name: 'Boduppal Main Road', pincode: '500039', area: 'Boduppal Corridor', lat: 17.4140, lng: 78.5860, type: 'locality' },
  { name: 'Rampally X Roads', pincode: '501401', area: 'Keesara / Pocharam North', lat: 17.4780, lng: 78.6350, type: 'locality' },
  { name: 'Nagaram Main Road', pincode: '501401', area: 'Keesara', lat: 17.4850, lng: 78.6150, type: 'locality' },
  { name: 'Uppal Junction', pincode: '500039', area: 'Uppal', lat: 17.4020, lng: 78.5600, type: 'locality' },
];

export function isLocationServiceable(lat: number, lng: number, pincode?: string): boolean {
  if (pincode && SERVICEABLE_PINCODES.includes(pincode.trim())) {
    return true;
  }
  // Check distance from zone center (12km radius)
  const dLat = (lat - ZONE_CENTER.lat) * 111;
  const dLng = (lng - ZONE_CENTER.lng) * 111 * Math.cos(ZONE_CENTER.lat * (Math.PI / 180));
  const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
  if (distKm <= ZONE_CENTER.radiusKm) {
    return true;
  }
  // Check if near any recognized serviceable community
  const nearest = getNearestCommunity(lat, lng);
  return nearest.isClose;
}

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

  const distanceKm = Math.sqrt(minDistance) * 111;
  const isClose = distanceKm <= 3.0;
  return { community: closest, isClose, distanceKm };
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


