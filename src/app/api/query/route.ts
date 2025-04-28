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

    const connection = await mysql.createConnection({ host, user, password, database });

    // Fetch all tables
    const [tables]: any = await connection.query("SHOW TABLES");
    const tableNames = tables.map((table: any) => table[`Tables_in_${database}`]);

    // Fetch columns for each table
    const columns: { [key: string]: string[] } = {};
    for (const table of tableNames) {
      const [cols]: any = await connection.query(`SHOW COLUMNS FROM ${table}`);
      columns[table] = cols.map((col: any) => col.Field);
    }

    // Define schema dynamically based on fetched tables and columns
    const schema = tableNames.map(table => {
      const tableColumns = columns[table].join(", ");
      return `TABLE ${table}(${tableColumns})`;
    }).join("\n");

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

    Example 3: "What is the total cost for 3kg Rice, 1kg Salt, and 3kg Sugar?" →
    SELECT 
        SUM(price_per_unit * quantity) AS total_cost
    FROM (
        SELECT price_per_unit, 3 AS quantity FROM groceries WHERE name = 'Rice'
        UNION ALL
        SELECT price_per_unit, 1 AS quantity FROM groceries WHERE name = 'Salt'
        UNION ALL
        SELECT price_per_unit, 3 AS quantity FROM groceries WHERE name = 'Sugar'
    ) AS subquery;
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
      temperature: 0,
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
      tables: tableNames,  // Send tables to frontend
      columns,  // Send columns to frontend
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
