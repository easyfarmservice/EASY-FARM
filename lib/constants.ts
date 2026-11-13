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

// Ghatkesar & Pocharam corridor gated communities and localities with precise map coordinates
export const SERVICEABLE_COMMUNITIES = [
  { name: 'Singapore Township', pincode: '500088', area: 'Pocharam', lat: 17.4475, lng: 78.6534 },
  { name: 'Sanskruti Township', pincode: '500088', area: 'Pocharam', lat: 17.4468, lng: 78.6540 },
  { name: 'Emerald Heights', pincode: '500088', area: 'Pocharam', lat: 17.4520, lng: 78.6650 },
  { name: 'Pocharam IT Corridor', pincode: '500088', area: 'Pocharam', lat: 17.4540, lng: 78.6600 },
  { name: 'Narapally', pincode: '500098', area: 'Narapally Corridor', lat: 17.4190, lng: 78.6250 },
  { name: 'Korremula', pincode: '500098', area: 'Ghatkesar mandal', lat: 17.4300, lng: 78.6380 },
  { name: 'Chowdariguda', pincode: '500098', area: 'Narapally', lat: 17.4120, lng: 78.6300 },
  { name: 'Rajeev Gruha Kalpa', pincode: '501301', area: 'Ghatkesar', lat: 17.4296638, lng: 78.6696088 },
  { name: 'Modi Emerald Park', pincode: '501301', area: 'Ghatkesar', lat: 17.4410, lng: 78.6750 },
  { name: 'Ghatkesar Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4436, lng: 78.6823 },
  { name: 'Yamnampet', pincode: '501301', area: 'Ghatkesar', lat: 17.4620, lng: 78.6700 },
  { name: 'Aushapur', pincode: '501301', area: 'Ghatkesar', lat: 17.4640, lng: 78.7100 },
  { name: 'Sri Aditya Homes', pincode: '501301', area: 'Ghatkesar', lat: 17.4380, lng: 78.6810 },
  { name: 'Peerzadiguda / Medipally', pincode: '500092', area: 'Medipally Corridor', lat: 17.4080, lng: 78.6050 },
  { name: 'Boduppal', pincode: '500039', area: 'Boduppal Corridor', lat: 17.4140, lng: 78.5860 },
  { name: 'Rampally', pincode: '501401', area: 'Keesara / Pocharam North', lat: 17.4780, lng: 78.6350 },
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
