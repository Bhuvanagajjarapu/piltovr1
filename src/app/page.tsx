'use client';
import { useState } from "react";
import axios from "axios";

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
  const [reasoning, setReasoning] = useState(""); // Reasoning state

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
      setReasoning(res.data.reasoning); 
    } catch (err: any) {
      alert("Query failed: " + err.message);
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SQL Assistant</h1>

      {!connected && (
        <>
          <input
            type="text"
            placeholder="Host"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="User"
            value={form.user}
            onChange={(e) => setForm({ ...form, user: e.target.value })}
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Database"
            value={form.database}
            onChange={(e) => setForm({ ...form, database: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Table"
            value={form.table}
            onChange={(e) => setForm({ ...form, table: e.target.value })}
            className="input"
          />
          <button onClick={handleConnect} className="btn">Connect</button>
        </>
      )}

      {connected && (
        <>
          <p className="my-2">Connected! Columns: {columns.join(", ")}</p>
          <input
            type="text"
            placeholder="Ask your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input"
          />
          <button onClick={handleAsk} className="btn mt-2">Generate Query</button>

          {sqlQuery && (
            <>
              <h3 className="mt-4 font-bold">Generated SQL:</h3>
              <pre className="bg-gray-100 p-2 rounded">{sqlQuery}</pre>

              {reasoning && (
                <>
                  <h3 className="mt-2 font-semibold">Reasoning:</h3>
                  <p className="bg-yellow-50 p-2 rounded">{reasoning}</p>
                </>
              )}
            </>
          )}

          {results.length > 0 && (
            <>
              <h3 className="mt-4 font-bold">Results:</h3>
              <table className="table-auto border w-full text-sm">
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>
                      {row.map((val: any, j: number) => (
                        <td key={j} className="border px-2 py-1">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </main>
  );
}
