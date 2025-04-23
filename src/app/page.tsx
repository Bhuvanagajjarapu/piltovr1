"use client";

import { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

export default function Home() {
  const [form, setForm] = useState({
    host: "localhost",
    user: "root",
    password: "",
    database: "",
    table: "",
  });

  const [connected, setConnected] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [forecastOutput, setForecastOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      const res = await axios.post("/api/connect", form);
      setColumns(res.data.columns);
      setConnected(true);
    } catch (err: any) {
      alert("Connection failed: " + err.message);
    }
  };

  const handleAsk = async () => {
    try {
      const res = await axios.post("/api/query", {
        ...form,
        question,
        columns,
      });
      setSqlQuery(res.data.sql);
      setResults(res.data.results);
    } catch (err: any) {
      alert("Query failed: " + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const prompt = `
      Based on the past data, we need to find out the forecast for next month. 
      How many number of units will be possibly get sold of each design?
    `;

    const res = await axios.post("/api/forecast", { prompt, data: jsonData });
    setForecastOutput(res.data.output);
    setLoading(false);
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gemini SQL + Forecast Assistant</h1>

      {!connected && (
        <>
          <input type="text" placeholder="Host" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} className="input" />
          <input type="text" placeholder="User" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} className="input" />
          <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" />
          <input type="text" placeholder="Database" value={form.database} onChange={e => setForm({ ...form, database: e.target.value })} className="input" />
          <input type="text" placeholder="Table" value={form.table} onChange={e => setForm({ ...form, table: e.target.value })} className="input" />
          <button onClick={handleConnect} className="btn">Connect</button>
        </>
      )}

      {connected && (
        <>
          <p className="my-2">Connected! Columns: {columns.join(", ")}</p>
          <input type="text" placeholder="Ask your question..." value={question} onChange={e => setQuestion(e.target.value)} className="input" />
          <button onClick={handleAsk} className="btn mt-2">Generate Query</button>

          {sqlQuery && (
            <>
              <h3 className="mt-4 font-bold">Generated SQL:</h3>
              <pre className="bg-gray-100 p-2">{sqlQuery}</pre>
            </>
          )}

          {results.length > 0 && (
            <>
              <h3 className="mt-4 font-bold">Results:</h3>
              <table className="table-auto border">
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>{row.map((val: any, j: number) => <td key={j}>{val}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <hr className="my-6" />
          <h2 className="text-xl font-semibold">Upload Excel to Forecast</h2>
          <label className="btn cursor-pointer mt-2">
            Upload Excel File
            <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
          </label>
          {fileName && <p className="mt-2">Uploaded: {fileName}</p>}

          {loading ? (
            <p className="mt-4">Generating forecast...</p>
          ) : (
            forecastOutput && (
              <div className="mt-4 p-3 border rounded bg-gray-50 whitespace-pre-wrap">
                {forecastOutput}
              </div>
            )
          )}
        </>
      )}
    </main>
  );
}
