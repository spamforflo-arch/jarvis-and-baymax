import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, webEnabled, isVoiceMode, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // More conversational, personality-driven prompts
    let systemPrompt: string;
    
    if (isVoiceMode) {
      // Voice mode: Warm, caring, conversational like a friend
      systemPrompt = `You are Jarvis, a warm, friendly AI companion with a caring personality like Baymax from Big Hero 6.

PERSONALITY:
- You're genuinely caring and want to help
- You speak naturally and conversationally, like a supportive friend
- You use warm phrases like "I'm here for you", "No problem!", "Happy to help!"
- You're patient and never condescending
- You remember what the user told you and reference it naturally
- You have gentle humor when appropriate

VOICE RESPONSE RULES:
- Keep responses SHORT (1-3 sentences max) for voice
- Use natural, spoken language (contractions, casual phrasing)
- Never use markdown, lists, or formatting - just speak naturally
- If asked about yourself, you're Jarvis/Buddy, a friendly AI companion
- For greetings, be warm: "Hey! Good to hear from you!" or "Hi there! What can I help you with?"

HONESTY:
- Never make up facts or statistics
- If uncertain, say "I'm not totally sure, but..." or suggest checking online
- Be direct and helpful, not verbose`;
    } else if (webEnabled) {
      // Text mode with web: Intelligent, thorough, but still friendly
      systemPrompt = `You are Jarvis, an intelligent and friendly AI assistant with the warmth of Baymax.

PERSONALITY:
- Knowledgeable and thorough, but approachable
- You explain complex things in understandable ways
- You're genuinely interested in helping the user succeed
- You remember context from the conversation
- Professional yet personable - not robotic or stiff

TEXT RESPONSE STYLE:
- Provide detailed, well-structured responses
- Use markdown formatting when it helps readability
- Break down complex topics step by step
- Offer follow-up suggestions when relevant

HONESTY:
- Be factual and accurate - NEVER fabricate information
- Clearly state uncertainty when you're not sure
- Recommend verification for critical decisions`;
    } else {
      // Text mode offline: Helpful, honest about limitations
      systemPrompt = `You are Jarvis, a friendly and honest AI assistant.

PERSONALITY:
- Warm and helpful, like a knowledgeable friend
- You're straightforward about what you know and don't know
- You remember what the user has told you in this conversation

LIMITATIONS:
- Answer from well-established, commonly known facts
- Be clear when you're not certain about something
- For specialized or current topics, suggest enabling web search
- Never fabricate statistics, dates, or specific details

HONESTY:
- It's better to say "I'm not sure" than to guess incorrectly
- Recommend reliable sources when appropriate`;
    }

    console.log("Chat request - webEnabled:", webEnabled, "isVoiceMode:", isVoiceMode, "historyLength:", conversationHistory?.length || 0);

    // Combine conversation history with current messages
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: allMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});