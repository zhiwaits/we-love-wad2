const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabaseStorage] Missing SUPABASE_URL or SUPABASE_KEY environment variables. Image operations will fail.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const ensureClient = () => {
  if (!supabase) {
    throw new Error('Supabase client not initialised. Check SUPABASE_URL and SUPABASE_KEY env variables.');
  }
  return supabase;
};

const uploadImageToSupabase = async (imageBase64, originalFileName, type = 'events') => {
  const client = ensureClient();

  if (!imageBase64 || !originalFileName) {
    throw new Error('Image data and original filename are required for upload');
  }

  // Convert base64 to buffer
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate unique filename
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const extension = originalFileName.split('.').pop();
  const sanitizedExtension = extension ? extension.toLowerCase() : 'png';
  const fileName = `${type}/${timestamp}-${uniqueId}.${sanitizedExtension}`;

  const { error } = await client.storage
    .from('wad2-project-images')
    .upload(fileName, buffer, {
      contentType: `image/${sanitizedExtension}`,
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = client.storage
    .from('wad2-project-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

const deleteImageFromSupabase = async (imageUrl) => {
  const client = ensureClient();

  if (!imageUrl) {
    return;
  }

  const [_, filePath] = imageUrl.split('/wad2-project-images/');
  if (!filePath) {
    return;
  }

  const { error } = await client.storage
    .from('wad2-project-images')
    .remove([filePath]);

  if (error) {
    console.error('Supabase delete error:', error.message);
  }
};

module.exports = {
  uploadImageToSupabase,
  deleteImageFromSupabase,
};
