
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const YOUTUBE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function analyzeImageWithGemini(imageUrl: string) {
  console.log('Analyzing image with Gemini:', imageUrl);
  
  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `You are MrBeast's title writer. Based on this image, generate 3 viral YouTube titles in MrBeast's style.
              Focus on:
              - High stakes or big rewards ($1M, survival challenges)
              - Specific actions from the image
              - Curiosity and urgency
              - Big numbers and extremes
              - Short, punchy phrases
              Format as a JSON array of strings only.`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze image with Gemini');
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    return JSON.parse(data.candidates[0].content.parts[0].text.trim());
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

async function generateThumbnailWithDallE(prompt: string) {
  console.log('Generating thumbnail with DALL-E:', prompt);
  
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
      const error = await response.json();
      console.error('DALL-E API error:', error);
      throw new Error('DALL-E API request failed');
    }

    const data = await response.json();
    console.log('DALL-E response:', data);

    return data.data[0].url;
  } catch (error) {
    console.error('Error generating with DALL-E:', error);
    throw error;
  }
}

async function generateThumbnailWithImagen(prompt: string) {
  console.log('Generating thumbnail with Imagen:', prompt);

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
      const error = await response.json();
      console.error('Imagen API error:', error);
      throw new Error('Imagen API request failed');
    }

    const data = await response.json();
    console.log('Imagen response:', data);

    return data.images[0].imageUrl;
  } catch (error) {
    console.error('Error generating with Imagen:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Request received');
    const { uploadedImageUrl, customPrompt, model = 'dalle' } = await req.json();
    console.log('Request body:', { uploadedImageUrl, customPrompt, model });

    // Handle uploaded image analysis
    if (uploadedImageUrl) {
      console.log('Analyzing uploaded image:', uploadedImageUrl);
      const generatedTitles = await analyzeImageWithGemini(uploadedImageUrl);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            generatedTitles,
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Handle custom prompt for thumbnail generation
    if (customPrompt) {
      console.log('Generating thumbnail with model:', model);
      const generatedThumbnailUrl = model === 'dalle' 
        ? await generateThumbnailWithDallE(customPrompt)
        : await generateThumbnailWithImagen(customPrompt);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            generatedThumbnailUrl,
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'No valid input provided',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
