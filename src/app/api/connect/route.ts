import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { host, user, password, database } = await req.json();

    const connection = await mysql.createConnection({ host, user, password, database });

    const [tables] = await connection.query<{ [key: string]: string }[]>(`SHOW TABLES`);
    const tableKey = `Tables_in_${database}`;
    const tableNames = tables.map((t) => t[tableKey]);

    const columns: Record<string, string[]> = {};
    for (const table of tableNames) {
      const [cols] = await connection.query<{ Field: string }[]>(`SHOW COLUMNS FROM \`${table}\``);
      columns[table] = cols.map((col) => col.Field);
    }

    await connection.end();
    return NextResponse.json({ tables: tableNames, columns });
  } catch (error) {
    console.error("Connect Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
