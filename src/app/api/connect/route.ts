import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { host, user, password, database } = await req.json();
    const connection = await mysql.createConnection({ host, user, password, database });

    const [tables]: any = await connection.query(`SHOW TABLES`);
    const tableKey = `Tables_in_${database}`;
    const tableNames = tables.map((t: any) => t[tableKey]);

    const columns: { [key: string]: string[] } = {};
    for (const table of tableNames) {
      const [cols]: any = await connection.query(`SHOW COLUMNS FROM ${table}`);
      columns[table] = cols.map((col: any) => col.Field);
    }

    await connection.end();
    return NextResponse.json({ tables: tableNames, columns });
  } catch (error) {
    console.error("Connect Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
