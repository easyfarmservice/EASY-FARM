export const APP_NAME = 'Easy Farm';
export const APP_SLOGAN = 'Farm Fresh, Delivered Differently. Every Sunday to Your Door.';
export const LAUNCH_ZONE = 'Ghatkesar & Pocharam, Hyderabad (Active)';
export const LAUNCH_CITY = 'Hyderabad';
export const CUTOFF_DAY = 'Saturday';
export const CUTOFF_TIME = '23:59:59'; // Saturday 11:59 PM
export const DELIVERY_DAY = 'Sunday';
export const DELIVERY_TIME_PROMISE = 'Sunday by 6 PM';

// Ghatkesar service center coordinates (Pocharam / Singapore Township corridor)
export const ZONE_CENTER = {
  lat: 17.4475,
  lng: 78.6590,
  radiusKm: 12,
};

// Ghatkesar serviceable pincodes (Active Sunday delivery corridor)
export const SERVICEABLE_PINCODES = [
  '500088', // Pocharam, Singapore Township, Sanskruti, Infosys SEZ
  '501301', // Ghatkesar, Kondapur, Yamnampet, Aushapur, Annojiguda
  '500098', // Narapally, Korremula, Chowdariguda, Venkatadri Nagar
  '500039', // Boduppal, Mallapur
  '500092', // Peerzadiguda, Medipally, Parvathapur
  '501401', // Rampally, Nagaram
];

// Ghatkesar & Pocharam corridor gated communities, societies, sectors, and micro-localities
export const SERVICEABLE_COMMUNITIES = [
  // ── Pocharam & Singapore Township Corridor (PIN: 500088) ──
  { name: 'Singapore Township Sector 1', pincode: '500088', area: 'Pocharam', lat: 17.4475, lng: 78.6534 },
  { name: 'Singapore Township Sector 2', pincode: '500088', area: 'Pocharam', lat: 17.4485, lng: 78.6520 },
  { name: 'Singapore Township Sector 3', pincode: '500088', area: 'Pocharam', lat: 17.4460, lng: 78.6545 },
  { name: 'Sanskruti Township', pincode: '500088', area: 'Pocharam', lat: 17.4468, lng: 78.6540 },
  { name: 'Sanskruti Global School Road', pincode: '500088', area: 'Pocharam', lat: 17.4455, lng: 78.6550 },
  { name: 'Modi Emerald Heights Phase 1', pincode: '500088', area: 'Pocharam', lat: 17.4520, lng: 78.6650 },
  { name: 'Modi Emerald Heights Phase 2', pincode: '500088', area: 'Pocharam', lat: 17.4535, lng: 78.6660 },
  { name: 'Raheja Mindspace IT Park', pincode: '500088', area: 'Pocharam', lat: 17.4510, lng: 78.6580 },
  { name: 'Infosys SEZ Campus Gate 1', pincode: '500088', area: 'Pocharam', lat: 17.4540, lng: 78.6600 },
  { name: 'Infosys SEZ Campus Gate 2', pincode: '500088', area: 'Pocharam', lat: 17.4570, lng: 78.6620 },
  { name: 'Pocharam Village Main Road', pincode: '500088', area: 'Pocharam', lat: 17.4560, lng: 78.6530 },
  { name: 'Sree Vensai Meadows', pincode: '500088', area: 'Pocharam', lat: 17.4490, lng: 78.6490 },
  { name: 'NSR Green Meadows', pincode: '500088', area: 'Pocharam', lat: 17.4440, lng: 78.6510 },

  // ── Annojiguda Corridor (PIN: 501301 / 500088) ──
  { name: 'Annojiguda ORR Junction', pincode: '501301', area: 'Annojiguda', lat: 17.4380, lng: 78.6590 },
  { name: 'Annojiguda Village', pincode: '501301', area: 'Annojiguda', lat: 17.4350, lng: 78.6570 },
  { name: 'Annojiguda Residential Enclave', pincode: '501301', area: 'Annojiguda', lat: 17.4330, lng: 78.6585 },

  // ── Narapally & Korremula Corridor (PIN: 500098) ──
  { name: 'Narapally Main Junction', pincode: '500098', area: 'Narapally', lat: 17.4190, lng: 78.6250 },
  { name: 'Vignan Institute & Hills', pincode: '500098', area: 'Narapally', lat: 17.4160, lng: 78.6280 },
  { name: 'Venkatadri Nagar', pincode: '500098', area: 'Narapally', lat: 17.4220, lng: 78.6240 },
  { name: 'Chowdariguda Village', pincode: '500098', area: 'Narapally', lat: 17.4120, lng: 78.6300 },
  { name: 'Korremula Road', pincode: '500098', area: 'Ghatkesar mandal', lat: 17.4300, lng: 78.6380 },
  { name: 'Korremula Gram Panchayat', pincode: '500098', area: 'Ghatkesar mandal', lat: 17.4320, lng: 78.6410 },
  { name: 'Srinidhi Institute Road', pincode: '501301', area: 'Yamnampet', lat: 17.4580, lng: 78.6650 },

  // ── Ghatkesar & Yamnampet Corridor (PIN: 501301) ──
  { name: 'Modi Emerald Park Villas', pincode: '501301', area: 'Ghatkesar', lat: 17.4410, lng: 78.6750 },
  { name: 'Rajeev Gruha Kalpa', pincode: '501301', area: 'Ghatkesar', lat: 17.4296638, lng: 78.6696088 },
  { name: 'Sri Aditya Homes', pincode: '501301', area: 'Ghatkesar', lat: 17.4380, lng: 78.6810 },
  { name: 'Aditya Enclave', pincode: '501301', area: 'Ghatkesar', lat: 17.4390, lng: 78.6825 },
  { name: 'Ghatkesar Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4436, lng: 78.6823 },
  { name: 'Ghatkesar Railway Station Area', pincode: '501301', area: 'Ghatkesar', lat: 17.4460, lng: 78.6840 },
  { name: 'Ghatkesar Bus Depot', pincode: '501301', area: 'Ghatkesar', lat: 17.4420, lng: 78.6810 },
  { name: 'Yamnampet Village', pincode: '501301', area: 'Ghatkesar', lat: 17.4620, lng: 78.6700 },
  { name: 'Aushapur Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4640, lng: 78.7100 },
  { name: 'VBIT College Campus Road', pincode: '501301', area: 'Aushapur', lat: 17.4610, lng: 78.7050 },

  // ── Extended Corridor (Peerzadiguda, Medipally, Boduppal, Rampally) ──
  { name: 'Peerzadiguda Municipal Office', pincode: '500092', area: 'Medipally Corridor', lat: 17.4080, lng: 78.6050 },
  { name: 'Medipally Warangal Highway', pincode: '500092', area: 'Medipally Corridor', lat: 17.4050, lng: 78.6120 },
  { name: 'Boduppal Main Road', pincode: '500039', area: 'Boduppal Corridor', lat: 17.4140, lng: 78.5860 },
  { name: 'Rampally X Roads', pincode: '501401', area: 'Keesara / Pocharam North', lat: 17.4780, lng: 78.6350 },
  { name: 'Nagaram Main Road', pincode: '501401', area: 'Keesara', lat: 17.4850, lng: 78.6150 },
];


// Next delivery calculation utility
export function getNextDeliveryDate(): { deliveryDate: Date; cutoffDate: Date; isOrderingOpen: boolean } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // If today is Sunday (currentDay === 0), order cutoff for today was Saturday 11:59 PM.
  // Any order placed on Sunday (after 12:00 AM) is delivered next Sunday (7 days later).
  let daysUntilSunday = currentDay === 0 ? 7 : (7 - currentDay);

  // Target Sunday
  const upcomingSunday = new Date(now);
  upcomingSunday.setDate(now.getDate() + daysUntilSunday);
  upcomingSunday.setHours(18, 0, 0, 0); // Sunday by 6 PM

  // Calculate cutoff: Saturday immediately preceding target Sunday at 11:59:59 PM
  const cutoff = new Date(upcomingSunday);
  cutoff.setDate(upcomingSunday.getDate() - 1); // Saturday
  cutoff.setHours(23, 59, 59, 999); // 11:59:59 PM

  let isOrderingOpen = now <= cutoff;

  // If ordering is closed for this Sunday, push delivery target to NEXT Sunday
  if (!isOrderingOpen) {
    upcomingSunday.setDate(upcomingSunday.getDate() + 7);
    cutoff.setDate(cutoff.getDate() + 7);
    isOrderingOpen = now <= cutoff;
  }

  return {
    deliveryDate: upcomingSunday,
    cutoffDate: cutoff,
    isOrderingOpen,
  };
}
