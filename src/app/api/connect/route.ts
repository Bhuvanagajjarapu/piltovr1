import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { host, user, password, database, table } = await req.json();
    const connection = await mysql.createConnection({ host, user, password, database });

    const [rows]: any = await connection.query(`SHOW COLUMNS FROM ${table}`);
    const columns = rows.map((col: any) => col.Field);

    return NextResponse.json({ columns });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
