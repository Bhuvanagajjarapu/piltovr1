import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const prompt = formData.get("prompt")?.toString() || "";

    if (!file || !prompt) {
      return NextResponse.json({ error: "File or prompt missing" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const dataString = JSON.stringify(jsonData, null, 2);

    const finalPrompt = `
You are a data analyst AI. Analyze the following Excel data and respond to the user query.

Excel Data:
${dataString}

User Prompt:
${prompt}

Return a clear, concise response with calculations or insights if needed.
`;

    const llamaRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful data analyst." },
          { role: "user", content: finalPrompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await llamaRes.json();

    return NextResponse.json({ result: data.choices?.[0]?.message?.content || "No response" });
  } catch (err) {
    console.error("Groq forecast error:", err);
    return NextResponse.json({ error: "Forecast generation failed" }, { status: 500 });
  }
}
