
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { youtubeUrl, customPrompt, uploadedImageUrl } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Function to extract video ID from YouTube URL
    const getVideoId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    };

    // Function to generate MrBeast-style titles using Gemini
    const generateTitles = async (originalTitle: string, thumbnailUrl: string) => {
      const prompt = `You are MrBeast's title writer. Based on this YouTube title: "${originalTitle}" and thumbnail URL: ${thumbnailUrl}, generate 3 alternative viral YouTube titles in MrBeast's style. Focus on big numbers, challenge concepts, and dramatic hooks. Format as a JSON array of strings.`;
      
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();
      console.log('Gemini response:', data);
      const titlesText = data.candidates[0].content.parts[0].text;
      try {
        return JSON.parse(titlesText);
      } catch (e) {
        console.error('Error parsing Gemini response:', e);
        // Fallback parsing: extract titles from text
        return titlesText
          .split('\n')
          .filter(line => line.length > 0)
          .slice(0, 3);
      }
    };

    // Function to generate thumbnail using DALL-E 3
    const generateThumbnail = async (prompt: string) => {
      const enhancedPrompt = `Create a YouTube thumbnail in MrBeast's style for: ${prompt}. Make it bold, colorful, and dramatic with large text elements. Ensure it's eye-catching and uses bright colors.`;
      
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
      return data.data[0].url;
    };

    let originalTitle = '';
    let thumbnailUrl = '';
    let videoData = null;

    // Handle YouTube URL analysis
    if (youtubeUrl) {
      const videoId = getVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      videoData = await response.json();
      console.log('YouTube API response:', videoData);

      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('Video not found');
      }

      originalTitle = videoData.items[0].snippet.title;
      thumbnailUrl = videoData.items[0].snippet.thumbnails.maxres?.url || 
                    videoData.items[0].snippet.thumbnails.high?.url;
    }

    // Generate new titles
    const generatedTitles = await generateTitles(originalTitle || 'Custom Image Upload', thumbnailUrl || uploadedImageUrl);

    // Generate new thumbnail if prompted
    let generatedThumbnailUrl = null;
    if (customPrompt) {
      generatedThumbnailUrl = await generateThumbnail(customPrompt);
    }

    // Store results in Supabase
    const { data: savedData, error } = await supabase
      .from('thumbnails')
      .insert({
        youtube_url: youtubeUrl || null,
        uploaded_image_path: uploadedImageUrl || null,
        custom_prompt: customPrompt || null,
        generated_titles: generatedTitles,
        generated_thumbnail_url: generatedThumbnailUrl,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          originalTitle,
          thumbnailUrl,
          generatedTitles,
          generatedThumbnailUrl,
          savedData,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
