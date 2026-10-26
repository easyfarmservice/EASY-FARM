import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import path from 'path';
import fs from 'fs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file uploaded' },
        { status: 400 }
      );
    }

    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported image format. Please upload JPG, PNG, or WebP.',
        },
        { status: 400 }
      );
    }

    // 2. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Image size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // 3. Attempt upload to Supabase Storage Bucket 'reward-products'
    try {
      const supabaseAdmin = createAdminClient();

      // Ensure bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      if (!buckets?.some((b) => b.name === 'reward-products')) {
        await supabaseAdmin.storage.createBucket('reward-products', {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        });
      }

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('reward-products')
        .upload(cleanFileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: pubUrlData } = supabaseAdmin.storage
          .from('reward-products')
          .getPublicUrl(cleanFileName);

        return NextResponse.json({
          success: true,
          url: pubUrlData.publicUrl,
          path: cleanFileName,
          source: 'supabase_storage',
        });
      }
    } catch (storageErr) {
      console.warn('[Storage Notice] Supabase storage upload falling back to local static directory:', storageErr);
    }

    // 4. Fallback: Save to public/uploads/rewards/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'rewards');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, cleanFileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/rewards/${cleanFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: cleanFileName,
      source: 'local_public',
    });
  } catch (error: any) {
    console.error('Image upload failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Image upload failed' },
      { status: 500 }
    );
  }
}
