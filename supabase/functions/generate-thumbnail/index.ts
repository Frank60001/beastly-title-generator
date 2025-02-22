
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function analyzeImageWithGemini(imageUrl: string) {
  console.log('Starting image analysis with Gemini:', imageUrl);
  
  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    console.log('Making request to Gemini API');
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
              - Specific actions and objects from the image
              - Curiosity and urgency
              - Big numbers and extremes
              - Short, punchy phrases
              Return ONLY a JSON array of 3 strings, nothing else.
              Example format: ["I Spent $1M On This Insane Challenge!", "Last To Leave Gets $500,000!", "World's Most Dangerous Stunt Ever!"]`
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
      const error = await response.json();
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API request failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Gemini raw response:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini');
    }

    const titlesText = data.candidates[0].content.parts[0].text.trim();
    console.log('Parsed titles:', titlesText);
    
    try {
      return JSON.parse(titlesText);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', e);
      // If JSON parsing fails, try to extract titles using regex
      const titles = titlesText.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || 
                    titlesText.split('\n').filter(t => t.trim()).slice(0, 3);
      return titles;
    }
  } catch (error) {
    console.error('Error in analyzeImageWithGemini:', error);
    throw error;
  }
}

async function generateThumbnailWithModel(prompt: string, model: 'dalle' | 'imagen') {
  console.log(`Generating thumbnail with ${model}:`, prompt);

  if (model === 'dalle') {
    try {
      console.log('Making request to DALL-E API');
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: `Create a YouTube thumbnail in MrBeast's style: ${prompt}. 
                  Make it bold and dramatic with bright colors (red, yellow, blue), 
                  include shocked/excited expressions, and make it instantly clickable with 
                  exaggerated elements. Use high contrast and dynamic composition.
                  Make it look professional and photorealistic.`,
          n: 1,
          size: "1792x1024",
          quality: "standard",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('DALL-E API error:', error);
        throw new Error(`DALL-E API request failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('DALL-E response:', data);

      return data.data[0].url;
    } catch (error) {
      console.error('Error in DALL-E generation:', error);
      throw error;
    }
  } else {
    try {
      console.log('Making request to Imagen API');
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a YouTube thumbnail in MrBeast's style: ${prompt}. 
                     Make it bold and dramatic with bright colors (red, yellow, blue), 
                     include shocked/excited expressions, and make it instantly clickable with 
                     exaggerated elements. Use high contrast and dynamic composition.
                     Make it look professional and photorealistic.`
            }]
          }]
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Imagen API error:', error);
        throw new Error(`Imagen API request failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Imagen response:', data);

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error in Imagen generation:', error);
      throw error;
    }
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
    const { uploadedImageUrl, customPrompt, model } = await req.json();
    console.log('Request body:', { uploadedImageUrl, customPrompt, model });

    // Handle image analysis
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

    // Handle thumbnail generation
    if (customPrompt) {
      console.log('Generating thumbnail with prompt:', customPrompt);
      const generatedThumbnailUrl = await generateThumbnailWithModel(customPrompt, model || 'dalle');

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
        error: 'No image URL or custom prompt provided',
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
