export const APP_NAME = 'Easy Farm';
export const APP_SLOGAN = 'Farm Fresh, Delivered Differently. Every Sunday to Your Door.';
export const LAUNCH_ZONE = 'Ghatkesar';
export const LAUNCH_CITY = 'Hyderabad';
export const CUTOFF_DAY = 'Saturday';
export const CUTOFF_TIME = '23:00:00'; // Saturday 11:00 PM
export const DELIVERY_DAY = 'Sunday';
export const DELIVERY_TIME_PROMISE = 'Sunday by 6 PM';

// Ghatkesar service center coordinates (Pocharam / Singapore Township corridor)
export const ZONE_CENTER = {
  lat: 17.4475,
  lng: 78.6590,
  radiusKm: 12,
};

// Ghatkesar serviceable pincodes
export const SERVICEABLE_PINCODES = ['500088', '501301', '500098'];

// Ghatkesar gated communities we serve with precise map coordinates
export const SERVICEABLE_COMMUNITIES = [
  { name: 'Rajeev Gruha Kalpa', pincode: '501301', area: 'Ghatkesar mandal', lat: 17.4296638, lng: 78.6696088 },
  { name: 'Singapore Township', pincode: '500088', area: 'Pocharam / Ghatkesar', lat: 17.4475, lng: 78.6534 },
  { name: 'Emerald Heights', pincode: '500088', area: 'Pocharam / Ghatkesar', lat: 17.4520, lng: 78.6650 },
  { name: 'Sanskruti Township', pincode: '500088', area: 'Pocharam / Ghatkesar', lat: 17.4468, lng: 78.6540 },
  { name: 'Pocharam IT Corridor', pincode: '500088', area: 'Ghatkesar', lat: 17.4540, lng: 78.6600 },
  { name: 'Modi Emerald Park', pincode: '501301', area: 'Ghatkesar', lat: 17.4410, lng: 78.6750 },
  { name: 'Ghatkesar Town Center', pincode: '501301', area: 'Ghatkesar', lat: 17.4436, lng: 78.6823 },
  { name: 'Sri Aditya Homes', pincode: '501301', area: 'Ghatkesar', lat: 17.4380, lng: 78.6810 },
];


// Next delivery calculation utility
export function getNextDeliveryDate(): { deliveryDate: Date; cutoffDate: Date; isOrderingOpen: boolean } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 4 = Thu, 5 = Fri, 6 = Sat

  let daysUntilSunday = (7 - currentDay) % 7;
  if (daysUntilSunday === 0 && now.getHours() >= 18) {
    daysUntilSunday = 7; // Next Sunday
  }

  // Calculate upcoming Sunday
  const upcomingSunday = new Date(now);
  upcomingSunday.setDate(now.getDate() + daysUntilSunday);
  upcomingSunday.setHours(18, 0, 0, 0);

  // Calculate cutoff (Saturday 11:00 PM before that Sunday)
  const cutoff = new Date(upcomingSunday);
  const daysBeforeSundayToSaturday = 1; // Sunday - 1 day = Saturday
  cutoff.setDate(upcomingSunday.getDate() - daysBeforeSundayToSaturday);
  cutoff.setHours(23, 0, 0, 0); // 11:00 PM

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
