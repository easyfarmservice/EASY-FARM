import { createAdminClient } from '@/lib/supabase/admin';
import { WaitlistEntry } from '@/types/database';

export class WaitlistService {
  static async addEntry(data: Omit<WaitlistEntry, 'id' | 'created_at'>) {
    const supabase = createAdminClient();

    const { data: inserted, error } = await supabase
      .from('waitlist')
      .insert([
        {
          name: data.name,
          phone: data.phone,
          email: data.email,
          pincode: data.pincode,
          locality: data.locality,
          apartment: data.apartment,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error("You're already registered on the waitlist for this PIN code!");
      }
      throw new Error(error.message);
    }

    return inserted;
  }
}
