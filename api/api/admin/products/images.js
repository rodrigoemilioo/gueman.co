import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const id = req.query.id;

    const file = req.body.file;

    if (!file) {
      return res.status(400).json({ error: 'No file' });
    }

    const fileName = `${id}/${Date.now()}-image.png`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
