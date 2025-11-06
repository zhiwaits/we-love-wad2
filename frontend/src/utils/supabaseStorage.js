const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const uploadImageToSupabase = async (imageBase64, originalFileName, type = 'events') => {
  try {
    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = originalFileName.split('.').pop();
    const fileName = `${type}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('wad2-project-images')
      .upload(fileName, buffer, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600',
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wad2-project-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

const deleteImageFromSupabase = async (imageUrl) => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/wad2-project-images/');
    if (urlParts.length < 2) return;
    
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from('wad2-project-images')
      .remove([filePath]);
    
    if (error) {
      console.error('Delete error:', error);
    }
  } catch (error) {
    console.error('Delete image error:', error);
  }
};

module.exports = { uploadImageToSupabase, deleteImageFromSupabase };