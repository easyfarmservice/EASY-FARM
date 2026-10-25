import { z } from 'zod';

export const LocationCheckSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    pincode: z.string().optional(),
    locality: z.string().optional(),
  })
  .refine(
    (data) => (data.latitude !== undefined && data.longitude !== undefined) || !!data.pincode,
    {
      message: 'Either coordinates (latitude & longitude) or pincode must be provided',
    }
  );

export const WaitlistSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().email('Valid email address is required'),
  pincode: z.string().min(6, 'Valid 6-digit PIN code is required').max(6),
  locality: z.string().min(2, 'Locality is required'),
  apartment: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const AddressSchema = z.object({
  label: z.string().default('Home'),
  full_address: z.string().min(5, 'Full address is required'),
  apartment: z.string().optional(),
  locality: z.string().min(2, 'Locality is required'),
  city: z.string().default('Hyderabad'),
  state: z.string().default('Telangana'),
  pincode: z.string().min(6).max(6),
  latitude: z.number(),
  longitude: z.number(),
  delivery_zone_id: z.string().optional(),
  delivery_area_id: z.string().optional(),
  delivery_location_id: z.string().optional(),
});

export const CartItemSchema = z.object({
  basket_id: z.string(),
  quantity: z.number().int().min(1),
});

export const CreateOrderSchema = z.object({
  address_id: z.string().uuid('Valid address selection required'),
  items: z.array(CartItemSchema).min(1, 'Cart cannot be empty'),
  notes: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
