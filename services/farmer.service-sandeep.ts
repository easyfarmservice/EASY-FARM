import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/async-utils';
import { SanityService } from './sanity.service';

export class FarmerService {
  static async getActiveFarmers() {
    return withTimeout(
      async () => {
        // 1. Check Sanity CMS
        try {
          const sanityFarmers = await SanityService.getActiveFarmers();
          if (sanityFarmers && sanityFarmers.length > 0) {
            return sanityFarmers.map((f: any) => ({
              id: f._id,
              name: f.name,
              phone: f.phone || '+91 98490 00000',
              village: f.village || 'Telangana',
              district: f.district || 'Medchal-Malkajgiri',
              state: 'Telangana',
              photo_url: f.photoUrl || '/images/hero-vegetables.png',
              description: f.description || '',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
          }
        } catch (err) {
          console.warn('[FarmerService] Sanity fetch skipped, using Supabase:', err);
        }

        // 2. Fall back to Supabase database
        const supabase = createAdminClient();

        const { data, error } = await supabase
          .from('farmers')
          .select('id, name, phone, village, district, state, photo_url, description, upi_identifier, active, created_at, updated_at')
          .eq('active', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching active farmers:', error);
          return [];
        }

        return data || [];
      },
      3000,
      []
    );
  }

  static async getFarmerPayments() {
    return withTimeout(
      async () => {
        const supabase = createAdminClient();

        const { data, error } = await supabase
          .from('farmer_payments')
          .select('*, farmer:farmers(name, village)')
          .order('payment_date', { ascending: false });

        if (error) {
          console.error('Error fetching farmer payments:', error);
          return [];
        }

        return data || [];
      },
      3000,
      []
    );
  }
}

