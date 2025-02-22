
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();
    
    if (!image_base64) {
      throw new Error('No image provided');
    }

    // Call both APIs in parallel
    const [geminiResults, gpt4Results] = await Promise.all([
      // Gemini Analysis
      fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
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
                Example: ["I Spent $1M On This Insane Challenge!", "Last To Leave Gets $500,000!", "World's Most Dangerous Stunt Ever!"]`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: image_base64
                }
              }
            ]
          }]
        }),
      }).then(res => res.json()),

      // GPT-4 Vision Analysis
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are MrBeast's title writer. Based on this image, generate 3 viral YouTube titles in MrBeast's style.
                  Focus on:
                  - High stakes or big rewards ($1M, survival challenges)
                  - Specific actions and objects from the image
                  - Curiosity and urgency
                  - Big numbers and extremes
                  - Short, punchy phrases
                  Return ONLY a JSON array of 3 strings, nothing else.
                  Example: ["I Spent $1M On This Insane Challenge!", "Last To Leave Gets $500,000!", "World's Most Dangerous Stunt Ever!"]`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${image_base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        }),
      }).then(res => res.json())
    ]);

    // Parse results
    let geminiTitles = [];
    try {
      const titlesText = geminiResults.candidates[0].content.parts[0].text.trim();
      geminiTitles = JSON.parse(titlesText);
    } catch (e) {
      console.error('Error parsing Gemini response:', e);
      geminiTitles = ["Error generating Gemini titles"];
    }

    let gpt4Titles = [];
    try {
      const titlesText = gpt4Results.choices[0].message.content.trim();
      gpt4Titles = JSON.parse(titlesText);
    } catch (e) {
      console.error('Error parsing GPT-4 response:', e);
      gpt4Titles = ["Error generating GPT-4 titles"];
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results: {
            gemini: geminiTitles,
            gpt4: gpt4Titles
          }
        }
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
