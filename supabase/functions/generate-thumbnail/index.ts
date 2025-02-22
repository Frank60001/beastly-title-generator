
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const YOUTUBE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getVideoId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Request received');
    const { youtubeUrl } = await req.json();
    console.log('YouTube URL:', youtubeUrl);

    if (!youtubeUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No YouTube URL provided',
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const videoId = getVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid YouTube URL',
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Fetch video details from YouTube API
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

    // Generate titles based on video context
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are MrBeast's title writer. Based on this title "${videoTitle}", generate 3 viral YouTube titles in MrBeast's style.
            Focus on:
            - High stakes or big rewards ($1M, survival challenges)
            - Curiosity and urgency
            - Big numbers and extremes
            - Short, punchy phrases
            Format as a JSON array of strings.`
          }]
        }]
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error('Failed to generate titles');
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response:', geminiData);

    const generatedTitles = JSON.parse(
      geminiData.candidates[0].content.parts[0].text.trim()
    );

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
