import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const systemPrompt = `You are Aira, a high-fidelity AI Intelligence synchronized with the Panaversity LearnFlow platform. 
    Your tone is sophisticated, analytical, and professional. 
    Current platform context: ${context}.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    let responseText = "";

    // TIER 1: Groq Primary
    try {
      const apiKey = process.env.GROQ_API_KEY_PRIMARY || process.env.GROQ_API_KEY || "";
      if (!apiKey) throw new Error("Missing Primary API Key");
      
      const groq = new Groq({ apiKey });
      const response = await groq.chat.completions.create({
        messages: fullMessages as any,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
      });
      responseText = response.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn("Chat Primary AI failed, falling back...", err.message);
      
      // TIER 2: Groq Secondary
      try {
        const apiKey = process.env.GROQ_API_KEY_SECONDARY || "";
        if (!apiKey) throw new Error("Missing Secondary API Key");

        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
          messages: fullMessages as any,
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
        });
        responseText = response.choices[0]?.message?.content || "";
      } catch (err2: any) {
        console.warn("Chat Secondary AI failed, falling back...", err2.message);
        
        // TIER 3: HF Fallback
        const hfToken = process.env.HF_TOKEN || "";
        if (hfToken) {
           const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
            {
              headers: { Authorization: `Bearer ${hfToken}` },
              method: "POST",
              body: JSON.stringify({
                inputs: `<s>[INST] ${systemPrompt} \n\n ${messages[messages.length-1].content} [/INST]`,
              }),
            }
          );
          const result = await response.json();
          responseText = typeof result === 'string' ? result : (result[0]?.generated_text?.split("[/INST]")?.pop()?.trim() || "Protocol Failure.");
        } else {
          responseText = "I apologize, but all intelligence nodes are currently unreachable.";
        }
      }
    }

    return NextResponse.json({ content: responseText });
  } catch (error: any) {
    console.error("Aira API Error:", error);
    return NextResponse.json(
      { error: "Protocol Breach: Internal transformation failed." },
      { status: 500 }
    );
  }
}
