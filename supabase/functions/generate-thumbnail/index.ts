
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const YOUTUBE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from YouTube URL
const getVideoId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Generate titles using Gemini based on image or context
async function generateTitlesWithGemini(imageUrl: string | null, context: string | null) {
  console.log('Generating titles with Gemini:', { imageUrl, context });
  
  const prompt = `You are MrBeast's title writer. ${
    imageUrl 
      ? "Based on this image, generate 3 viral YouTube titles in MrBeast's style." 
      : `Based on this context: "${context}", generate 3 viral YouTube titles in MrBeast's style.`
  }
  Focus on:
  - High stakes or big rewards ($1M, survival challenges)
  - Specific actions from the image
  - Curiosity and urgency
  - Big numbers and extremes
  - Short, punchy phrases
  
  Format the response as a JSON array of strings only.`;

  let requestBody;
  if (imageUrl) {
    // Fetch the image data
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }]
    };
  } else {
    requestBody = {
      contents: [{ 
        parts: [{ text: prompt }]
      }]
    };
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log('Gemini response:', data);
  
  try {
    const titlesText = data.candidates[0].content.parts[0].text;
    return JSON.parse(titlesText);
  } catch (e) {
    console.error('Error parsing Gemini response:', e);
    throw new Error('Failed to generate titles');
  }
}

// Generate thumbnail using DALL-E
async function generateThumbnailWithDallE(prompt: string) {
  console.log('Generating thumbnail with DALL-E:', { prompt });
  
  const enhancedPrompt = `Create a YouTube thumbnail in MrBeast's style: ${prompt}. 
  Make it bold and dramatic with bright colors (red, yellow, blue), 
  include shocked/excited expressions, and make it instantly clickable with 
  exaggerated elements. Use high contrast and dynamic composition.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
    }),
  });

  const data = await response.json();
  console.log('DALL-E response:', data);

  if (!data.data?.[0]?.url) {
    throw new Error('Failed to generate thumbnail with DALL-E');
  }

  return data.data[0].url;
}

// Generate thumbnail using Imagen 3
async function generateThumbnailWithImagen(prompt: string) {
  console.log('Generating thumbnail with Imagen:', { prompt });

  const enhancedPrompt = `Create a YouTube thumbnail in MrBeast's style: ${prompt}. 
  Make it bold and dramatic with bright colors (red, yellow, blue), 
  include shocked/excited expressions, and make it instantly clickable with 
  exaggerated elements. Use high contrast and dynamic composition.`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/imagen-3.0-generate-002:generateImages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      generation_config: {
        numberOfImages: 1,
      },
    }),
  });

  const data = await response.json();
  console.log('Imagen response:', data);

  if (!data.images?.[0]?.imageUrl) {
    throw new Error('Failed to generate thumbnail with Imagen');
  }

  return data.images[0].imageUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl, uploadedImageUrl, customPrompt, model = 'dalle' } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let generatedTitles: string[] = [];
    let generatedThumbnailUrl: string | null = null;
    let originalTitle: string | null = null;

    // Handle YouTube URL input
    if (youtubeUrl) {
      const videoId = getVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Fetch video details from YouTube API
      const ytResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      const ytData = await ytResponse.json();
      
      if (!ytData.items?.[0]?.snippet) {
        throw new Error('Video not found');
      }

      originalTitle = ytData.items[0].snippet.title;
      const thumbnailUrl = ytData.items[0].snippet.thumbnails.maxres?.url || 
                          ytData.items[0].snippet.thumbnails.high?.url;

      generatedTitles = await generateTitlesWithGemini(thumbnailUrl, originalTitle);
    }

    // Handle uploaded image input
    if (uploadedImageUrl) {
      generatedTitles = await generateTitlesWithGemini(uploadedImageUrl, null);
    }

    // Handle custom prompt for thumbnail generation
    if (customPrompt) {
      // Choose model based on user preference
      generatedThumbnailUrl = model === 'dalle' 
        ? await generateThumbnailWithDallE(customPrompt)
        : await generateThumbnailWithImagen(customPrompt);

      if (generatedThumbnailUrl) {
        // Generate new titles based on the generated thumbnail
        generatedTitles = await generateTitlesWithGemini(generatedThumbnailUrl, customPrompt);
      }
    }

    // Store results in Supabase
    const { error: dbError } = await supabase
      .from('thumbnails')
      .insert({
        youtube_url: youtubeUrl || null,
        original_title: originalTitle,
        generated_titles: generatedTitles,
        generated_thumbnail_url: generatedThumbnailUrl,
        custom_prompt: customPrompt || null,
      });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          originalTitle,
          generatedTitles,
          generatedThumbnailUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in generate-thumbnail function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
