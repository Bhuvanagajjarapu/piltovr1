import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize Groq (OpenAI-compatible) client
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {
    // Extract the request data
    const { host, user, password, database, table, columns, question } = await req.json();

    // Construct the prompt
    const prompt = `
    You are an expert in converting English questions to SQL queries!
    The database is called ${database} and has the table ${table.toUpperCase()} with these columns: ${columns.join(', ')}.
    Example 1: "How many students?" → SELECT COUNT(*) FROM ${table};
    Example 2: "Show all departments?" → SELECT * FROM ${table};
    Example 3: "What are the scores of Alice?" → SELECT m.subject, m.score FROM students s JOIN marks m ON s.student_id = m.student_id WHERE s.name = 'Alice';
    Example 4: "Tell me about Alice" → 
      Return detailed information like: "The student Alice is in the Computer Science department. Their email is alice@gmail.com. 
      Their scores in DBMS is 85 and OS is 78."
    Always use proper JOINs for foreign keys, and ensure correct table and column names.
    If the user requests sensitive information like passwords, *do not include the password in the response*.
    Do not use backticks, the word 'sql', or any extra text in the output — only the SQL query or a structured answer.
    `;

    // Get the response from Groq (OpenAI-compatible format)
    const chat = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: question }
      ],
      temperature: 0.2,
    });

    const sql = chat.choices[0].message.content?.trim() || "";

    // Check for sensitive data
    if (sql.toLowerCase().includes('password')) {
      return NextResponse.json({ error: "Sensitive information (password) should not be retrieved." }, { status: 400 });
    }

    // Connect to the MySQL database
    const connection = await mysql.createConnection({ host, user, password, database });

    // Execute the generated SQL query
    const [rows]: any = await connection.query(sql);

    // Format the results
    const formattedRows = rows.map((row: any) => {
      const formattedRow = { ...row };
      delete formattedRow.password;
      return Object.values(formattedRow);
    });

    return NextResponse.json({ sql, results: formattedRows });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
