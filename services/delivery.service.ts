import { createAdminClient } from '@/lib/supabase/admin';
import { DeliveryCheckResult } from '@/types/database';

export class DeliveryService {
  /**
   * PostGIS geospatial serviceability check
   * Queries the database function check_delivery_availability(lat, lng)
   * which executes ST_Covers(z.polygon, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
   * against active delivery zones.
   */
  static async checkAvailability(lat: number, lng: number): Promise<DeliveryCheckResult> {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase.rpc('check_delivery_availability', {
        lat,
        lng,
      });

      if (error) {
        console.error('PostGIS delivery RPC error:', error);
        return {
          available: false,
          delivery_fee: 0,
          minimum_order: 0,
          message: 'Unable to verify delivery serviceability at this moment. Please try again.',
        };
      }

      if (data && data.length > 0 && data[0].available) {
        const result = data[0];
        return {
          available: true,
          zone_id: result.zone_id,
          zone_name: result.zone_name,
          area_id: result.area_id,
          area_name: result.area_name,
          delivery_fee: Number(result.delivery_fee || 0),
          minimum_order: Number(result.minimum_order || 0),
          delivery_day: result.delivery_day || 'Sunday',
          delivery_promise: result.delivery_promise || 'Sunday by 6 PM',
        };
      }

      return {
        available: false,
        delivery_fee: 0,
        minimum_order: 0,
        message: "We don't deliver to this location yet. We currently serve our active launch zones in Ghatkesar & Pocharam.",
      };
    } catch (err: any) {
      console.error('Error in DeliveryService.checkAvailability:', err);
      return {
        available: false,
        delivery_fee: 0,
        minimum_order: 0,
        message: 'Unable to check location availability.',
      };
    }
  }

  /**
   * Database-backed pincode availability check
   * Checks if pincode is registered in any active delivery area belonging to an active delivery zone.
   */
  static async checkAvailabilityByPincode(pincode: string): Promise<DeliveryCheckResult> {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('delivery_areas')
        .select(`
          id,
          name,
          pincodes,
          active,
          delivery_zones (
            id,
            name,
            active,
            delivery_fee,
            minimum_order,
            delivery_day,
            delivery_promise
          )
        `)
        .contains('pincodes', [pincode.trim()])
        .eq('active', true)
        .limit(1);

      if (error) {
        console.error('Pincode check database error:', error);
        return {
          available: false,
          delivery_fee: 0,
          minimum_order: 0,
          message: 'Unable to verify pincode serviceability at this moment.',
        };
      }

      if (data && data.length > 0) {
        const area = data[0];
        const zone = Array.isArray(area.delivery_zones) ? area.delivery_zones[0] : area.delivery_zones;

        if (zone && zone.active) {
          return {
            available: true,
            zone_id: zone.id,
            zone_name: zone.name,
            area_id: area.id,
            area_name: area.name,
            delivery_fee: Number(zone.delivery_fee || 0),
            minimum_order: Number(zone.minimum_order || 0),
            delivery_day: zone.delivery_day || 'Sunday',
            delivery_promise: zone.delivery_promise || 'Sunday by 6 PM',
          };
        }
      }

      return {
        available: false,
        delivery_fee: 0,
        minimum_order: 0,
        message: "We don't deliver to this PIN code yet. We currently serve our active launch zones in Ghatkesar & Pocharam.",
      };
    } catch (err: any) {
      console.error('Error in DeliveryService.checkAvailabilityByPincode:', err);
      return {
        available: false,
        delivery_fee: 0,
        minimum_order: 0,
        message: 'Unable to check PIN code availability.',
      };
    }
  }
}
