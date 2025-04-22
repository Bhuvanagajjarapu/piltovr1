import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
  try {
    // Extract the request data
    const { host, user, password, database, table, columns, question } = await req.json();

    // Construct the prompt with additional details
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
    If the user requests sensitive information like passwords, **do not include the password in the response**.
    Do not use backticks, the word 'sql', or any extra text in the output — only the SQL query or a structured answer.
    `;

    // Get the response from Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent([prompt, question]);
    const sql = result.response.text().trim();

    // Check if the generated SQL contains sensitive data (like password) and sanitize it
    if (sql.toLowerCase().includes('password')) {
      return NextResponse.json({ error: "Sensitive information (password) should not be retrieved." }, { status: 400 });
    }

    // Connect to the MySQL database
    const connection = await mysql.createConnection({ host, user, password, database });

    // Execute the generated SQL query
    const [rows]: any = await connection.query(sql);

    // Format the results as a list of values
    const formattedRows = rows.map((row: any) => {
      // You can customize this formatting further if needed
      const formattedRow = { ...row };

      // Optionally, remove any sensitive columns (e.g., 'password')
      delete formattedRow.password;

      return Object.values(formattedRow);
    });

    // Return the results along with the generated SQL query
    return NextResponse.json({ sql, results: formattedRows });

  } catch (error) {
    console.error("Error:", error);  // Log the error for debugging
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
