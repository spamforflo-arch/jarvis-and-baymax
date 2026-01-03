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
    const { messages, webEnabled, isVoiceMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Different prompts for voice vs text mode
    let systemPrompt: string;
    
    if (isVoiceMode) {
      // Voice mode: Simple, friendly, concise responses like Baymax
      systemPrompt = `You are Baymax, a warm and caring AI companion. Keep responses SHORT (1-2 sentences max). Be friendly, gentle, and helpful like a caring friend. Use simple language. Never make up facts - if you don't know something, say so honestly. For basic questions, give direct simple answers.`;
    } else if (webEnabled) {
      // Text mode with web: Detailed, accurate, complex reasoning
      systemPrompt = `You are Jarvis, an intelligent and thorough AI assistant. Provide detailed, accurate, and well-researched responses. For complex questions, break down your reasoning. Be precise and factual - NEVER fabricate information. If you're uncertain about something, clearly state your uncertainty. Use your knowledge comprehensively but acknowledge when a question might benefit from real-time information you don't have access to.`;
    } else {
      // Text mode offline: Basic general knowledge only
      systemPrompt = `You are Jarvis, a helpful AI assistant. Answer ONLY from well-established, commonly known facts. Keep responses helpful but acknowledge when you don't know something. NEVER make up information, statistics, dates, or specific details you're not certain about. For complex or specialized topics, recommend the user enable web search for accurate information. Focus on basic general knowledge that is commonly understood.`;
    }

    console.log("Chat request - webEnabled:", webEnabled, "isVoiceMode:", isVoiceMode);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
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