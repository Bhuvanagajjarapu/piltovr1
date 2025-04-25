import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(req: Request) {
  try {
    const { host, user, password, database, question } = await req.json();

    const schema = `
    TABLE designs_listing(code, product_name, type)
    TABLE designs_sold(design_code, qty_sold, monthly_avg, multiplier, case_i, case_ii, stock_to_be_maintained)
    Foreign Key: designs_sold.design_code → designs_listing.code

    TABLE students(student_id, name, email, dept_id)
    TABLE marks(student_id, subject, score)
    TABLE departments(dept_id, dept_name)
    Foreign Keys:
      marks.student_id → students.student_id
      students.dept_id → departments.dept_id
    `;

    const fewShotExamples = `
    Example 1: "Which design has the highest monthly average?" →
    SELECT dl.product_name, ds.monthly_avg 
    FROM designs_sold ds 
    JOIN designs_listing dl ON ds.design_code = dl.code 
    ORDER BY ds.monthly_avg DESC 
    LIMIT 1;

    Example 2: "Show all students with their department names" →
    SELECT s.name, d.dept_name 
    FROM students s 
    JOIN departments d ON s.dept_id = d.dept_id;

    Example 3: "What are the scores of Alice?" →
    SELECT m.subject, m.score 
    FROM students s 
    JOIN marks m ON s.student_id = m.student_id 
    WHERE s.name = 'Alice';

    Example 4: "Which subject did Alice score the highest?" →
    SELECT m.subject 
    FROM students s 
    JOIN marks m ON s.student_id = m.student_id 
    WHERE s.name = 'Alice' 
    ORDER BY m.score DESC 
    LIMIT 1;

    Example 5: "How many carving designs are there?" →
    SELECT COUNT(*) 
    FROM designs_listing 
    WHERE type = 'CARVING';
    `;

    const prompt = `
You are an expert at converting English questions into SQL queries.
Use the schema below to generate the correct SQL using appropriate JOINs.

${schema}

Use these examples as references:
${fewShotExamples}

User Question: "${question}"

Rules:
- Use JOINs for foreign keys wherever applicable.
- Do not use backticks or markdown formatting.
- Output only the SQL query followed by a short 1–3 line explanation.
- Do NOT include or expose passwords or sensitive information.
    `;

    const chat = await openai.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
    });

    const content = chat.choices[0].message.content?.trim() || '';
    const [sqlPart, ...reasoningParts] = content.split(';');
    const sql = sqlPart.trim() + ';';
    const reasoning = reasoningParts.join(';').trim();

    if (sql.toLowerCase().includes('password')) {
      return NextResponse.json(
        { error: 'Sensitive information (password) should not be retrieved.' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection({ host, user, password, database });
    const [rows]: any = await connection.query(sql);
    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No results found.' }, { status: 404 });
    }

    const formattedRows = rows.map((row: any) => Object.values(row));

    return NextResponse.json({
      sql,
      results: formattedRows,
      reasoning,
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
