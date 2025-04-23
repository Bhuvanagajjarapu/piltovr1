import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  const { question, prompt } = await req.json();
  
  const apiKey = process.env.GROQ_API_KEY;
  const geminiURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  try {
    const res = await axios.post(`${geminiURL}?key=${apiKey}`, {
      contents: [{ parts: [{ text: `${prompt}\n${question}` }] }]
    });

    const responseText = res.data.candidates[0].content.parts[0].text;
    return NextResponse.json({ response: responseText });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to call Gemini API' }, { status: 500 });
  }
}
