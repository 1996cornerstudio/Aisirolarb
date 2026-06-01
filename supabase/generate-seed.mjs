// Generates supabase/seed.sql from the reference CSV.
// Usage: node supabase/generate-seed.mjs "/path/to/report.csv"
import { readFileSync, writeFileSync } from "node:fs";

const csvPath =
  process.argv[2] ||
  "/Users/macintosh/Downloads/Supabase Snippet Employee Attendance Report — MAY26.csv";

const raw = readFileSync(csvPath, "utf8").trim();
const lines = raw.split(/\r?\n/);
lines.shift(); // drop header

const q = (v) => {
  if (v == null || v === "" || v.toLowerCase() === "null") return "null";
  return `'${v.replace(/'/g, "''")}'`;
};
const ts = (v) => {
  if (!v || v.toLowerCase() === "null") return "null";
  // CSV times are local wall-clock; treat as Asia/Bangkok (+07).
  return `'${v.trim()}+07'`;
};

const values = lines
  .map((line) => {
    const c = line.split(",");
    const [, branch, name, timeIn, photoIn, timeOut, photoOut, remark] = c;
    return `  (${q(branch)}, ${q(name)}, ${ts(timeIn)}, ${q(photoIn)}, ${ts(
      timeOut
    )}, ${q(photoOut)}, ${q(remark)})`;
  })
  .join(",\n");

const sql = `-- Auto-generated seed data from the MAY26 report.
insert into public.attendance (branch, name, time_in, photo_in, time_out, photo_out, remark) values
${values};
`;

writeFileSync(new URL("./seed.sql", import.meta.url), sql);
console.log(`Wrote seed.sql with ${lines.length} rows.`);
