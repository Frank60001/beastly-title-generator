
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
    try {
      // Fetch the image data
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }
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
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image for title generation');
    }
  } else {
    requestBody = {
      contents: [{ 
        parts: [{ text: prompt }]
      }]
    };
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to generate titles with Gemini');
    }

    const data = await response.json();
    console.log('Gemini response:', data);
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini');
    }

    const titlesText = data.candidates[0].content.parts[0].text;
    return JSON.parse(titlesText);
  } catch (error) {
    console.error('Error in Gemini API call:', error);
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

  try {
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

    if (!response.ok) {
      throw new Error('DALL-E API request failed');
    }

    const data = await response.json();
    console.log('DALL-E response:', data);

    if (!data.data?.[0]?.url) {
      throw new Error('Invalid response from DALL-E');
    }

    return data.data[0].url;
  } catch (error) {
    console.error('Error in DALL-E API call:', error);
    throw new Error('Failed to generate thumbnail with DALL-E');
  }
}

// Generate thumbnail using Imagen 3
async function generateThumbnailWithImagen(prompt: string) {
  console.log('Generating thumbnail with Imagen:', { prompt });

  const enhancedPrompt = `Create a YouTube thumbnail in MrBeast's style: ${prompt}. 
  Make it bold and dramatic with bright colors (red, yellow, blue), 
  include shocked/excited expressions, and make it instantly clickable with 
  exaggerated elements. Use high contrast and dynamic composition.`;

  try {
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

    if (!response.ok) {
      throw new Error('Imagen API request failed');
    }

    const data = await response.json();
    console.log('Imagen response:', data);

    if (!data.images?.[0]?.imageUrl) {
      throw new Error('Invalid response from Imagen');
    }

    return data.images[0].imageUrl;
  } catch (error) {
    console.error('Error in Imagen API call:', error);
    throw new Error('Failed to generate thumbnail with Imagen');
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    const { youtubeUrl, uploadedImageUrl, customPrompt, model = 'dalle' } = await req.json();
    
    // Validate inputs
    if (!youtubeUrl && !uploadedImageUrl && !customPrompt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No input provided',
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid YouTube URL',
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      try {
        // Fetch video details from YouTube API
        const ytResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );

        if (!ytResponse.ok) {
          throw new Error('YouTube API request failed');
        }

        const ytData = await ytResponse.json();
        
        if (!ytData.items?.[0]?.snippet) {
          throw new Error('Video not found');
        }

        originalTitle = ytData.items[0].snippet.title;
        const thumbnailUrl = ytData.items[0].snippet.thumbnails.maxres?.url || 
                          ytData.items[0].snippet.thumbnails.high?.url;

        generatedTitles = await generateTitlesWithGemini(thumbnailUrl, originalTitle);
      } catch (error) {
        console.error('Error processing YouTube URL:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle uploaded image input
    if (uploadedImageUrl) {
      try {
        generatedTitles = await generateTitlesWithGemini(uploadedImageUrl, null);
      } catch (error) {
        console.error('Error processing uploaded image:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle custom prompt for thumbnail generation
    if (customPrompt) {
      try {
        // Choose model based on user preference
        generatedThumbnailUrl = model === 'dalle' 
          ? await generateThumbnailWithDallE(customPrompt)
          : await generateThumbnailWithImagen(customPrompt);

        if (generatedThumbnailUrl) {
          // Generate new titles based on the generated thumbnail
          generatedTitles = await generateTitlesWithGemini(generatedThumbnailUrl, customPrompt);
        }
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Store results in Supabase
    try {
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
    } catch (error) {
      console.error('Error storing results in database:', error);
      // Don't fail the request if database storage fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          originalTitle,
          generatedTitles,
          generatedThumbnailUrl,
        },
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in generate-thumbnail function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
