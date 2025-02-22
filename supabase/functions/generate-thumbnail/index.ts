
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const YOUTUBE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

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
              - Specific actions and objects from the image
              - Curiosity and urgency
              - Big numbers and extremes
              - Short, punchy phrases
              Return ONLY a JSON array of 3 strings, nothing else.
              Example format: ["Title 1", "Title 2", "Title 3"]`
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
      throw new Error('Failed to analyze image with Gemini');
    }

    const data = await response.json();
    console.log('Gemini analysis response:', data);

    // Extract the text content and parse it as JSON
    const titlesText = data.candidates[0].content.parts[0].text.trim();
    return JSON.parse(titlesText);
  } catch (error) {
    console.error('Error analyzing image:', error);
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
    const { uploadedImageUrl, youtubeUrl } = await req.json();
    console.log('Request body:', { uploadedImageUrl, youtubeUrl });

    // Handle YouTube URL
    if (youtubeUrl) {
      console.log('Processing YouTube URL:', youtubeUrl);
      const videoId = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const ytResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );

      if (!ytResponse.ok) {
        throw new Error('Failed to fetch video data from YouTube');
      }

      const ytData = await ytResponse.json();
      if (!ytData.items?.[0]?.snippet) {
        throw new Error('Video not found');
      }

      const videoTitle = ytData.items[0].snippet.title;
      const thumbnailUrl = ytData.items[0].snippet.thumbnails.maxres?.url || 
                          ytData.items[0].snippet.thumbnails.high?.url;

      console.log('Analyzing YouTube thumbnail:', thumbnailUrl);
      const generatedTitles = await analyzeImageWithGemini(thumbnailUrl);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            originalTitle: videoTitle,
            generatedTitles,
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Handle uploaded image
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

    return new Response(
      JSON.stringify({
        success: false,
        error: 'No image or YouTube URL provided',
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
