// Makes TARGET_DATABASE_URL an exact copy of SOURCE_DATABASE_URL with
// pg_dump/pg_restore. The target is WIPED. zero-cache's own state (the zero*
// schemas, its publication and replication slot) belongs to one zero-cache
// instance and is not copied; start the target's zero-cache with a fresh
// replica afterwards.
//
//   pnpm db:sync [--yes] [--jobs 2] [--exact-counts] [--dump-dir /path]

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, rm, stat, statfs, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs } from "node:util";
import postgres, { type Sql } from "postgres";

for (const candidate of [".env", "../../.env"]) {
  if (existsSync(candidate)) process.loadEnvFile(candidate);
}

type DbTarget = {
  raw: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  sslmode: string | null;
  redacted: string;
};

type TableInfo = {
  key: string;
  schema: string;
  name: string;
  bytes: number;
  rows: number;
};

const BAR_WIDTH = 20;
const ESTIMATE_TOLERANCE = 0.05;
const EXACT_TOLERANCE = 0.01;
const EXACT_COUNT_MAX_BYTES = 256 * 1024 * 1024;
const ZERO_SCHEMA_PATTERN = "^zero($|_)";
const ZERO_PUBLICATION_PATTERN = /^_zero_/;
const ZERO_EVENT_TRIGGER_PATTERN = /^zero_ddl_/;
const ZERO_SLOT_PATTERN = "^zero_\\d+_";

let activeChild: ChildProcess | null = null;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    activeChild?.kill("SIGTERM");
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

function fail(message: string): never {
  console.error(`🔴 ${message}`);
  process.exit(1);
}

function quotePattern(name: string) {
  return `"${name.replaceAll(`"`, `""`)}"`;
}

function fmtBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fmtDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function parseDbUrl(envName: string): DbTarget {
  const raw = process.env[envName];
  if (!raw) fail(`${envName} is not set. Put it in .env or the environment.`);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail(`${envName} is not a valid URL.`);
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) fail(`${envName} must be a postgres:// URL.`);

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !database) fail(`${envName} must include a host and a database name.`);

  const port = url.port || "5432";
  return {
    raw,
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    sslmode: url.searchParams.get("sslmode"),
    redacted: `${url.hostname}:${port}/${database}`,
  };
}

function toolEnv(db: DbTarget): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: db.host,
    PGPORT: db.port,
    PGDATABASE: db.database,
    PGOPTIONS: "-c statement_timeout=0",
  };
  if (db.user) env.PGUSER = db.user;
  if (db.password) env.PGPASSWORD = db.password;
  if (db.sslmode) env.PGSSLMODE = db.sslmode;
  return env;
}

async function connect(db: DbTarget, label: string): Promise<Sql> {
  const sql = postgres(db.raw, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    await sql`set statement_timeout = 0`;
  } catch (error) {
    fail(`Cannot connect to ${label} (${db.redacted}): ${(error as Error).message}`);
  }
  return sql;
}

async function serverMajor(sql: Sql): Promise<number> {
  const [row] = await sql<{ v: number }[]>`select current_setting('server_version_num')::int as v`;
  return Math.floor(Number(row.v) / 10_000);
}

async function toolMajor(command: string): Promise<number> {
  const output = await new Promise<string | null>((resolve) => {
    const child = spawn(command, ["--version"]);
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 ? out : null));
  });
  if (output === null) {
    fail(`${command} not found on PATH. Install the Postgres client tools (e.g. postgresql-client-18 from the PGDG apt repo).`);
  }
  const match = output.match(/(\d+)(?:\.\d+)?/);
  if (!match) fail(`Could not parse version from \`${command} --version\`: ${output.trim()}`);
  return Number(match[1]);
}

async function fetchZeroSchemas(sql: Sql): Promise<string[]> {
  const rows = await sql<{ nspname: string }[]>`
    select nspname from pg_namespace where nspname ~ ${ZERO_SCHEMA_PATTERN} order by 1
  `;
  return rows.map((row) => row.nspname);
}

async function fetchTables(sql: Sql): Promise<TableInfo[]> {
  const rows = await sql<{ schema: string; name: string; bytes: string; rows: string }[]>`
    select n.nspname as schema, c.relname as name,
           pg_table_size(c.oid)::bigint as bytes, c.reltuples::bigint as rows
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'm')
      and n.nspname <> 'information_schema' and n.nspname !~ '^pg_'
      and n.nspname !~ ${ZERO_SCHEMA_PATTERN}
    order by bytes desc, 1, 2
  `;
  return rows.map((row) => ({
    key: `${row.schema}.${row.name}`,
    schema: row.schema,
    name: row.name,
    bytes: Number(row.bytes),
    rows: Number(row.rows),
  }));
}

class PhaseProgress {
  private readonly totalBytes: number;
  private readonly timer: NodeJS.Timeout;
  private readonly startedAt = Date.now();
  private readonly inFlight: TableInfo[] = [];
  private readonly completed = new Set<string>();
  private completedBytes = 0;
  private diskBytes = 0;
  private lastKey = "";

  constructor(
    private readonly label: string,
    private readonly tables: TableInfo[],
    private readonly jobs: number,
    private readonly diskLabel: string,
  ) {
    this.totalBytes = tables.reduce((sum, t) => sum + t.bytes, 0);
    this.timer = setInterval(() => this.render(false), process.stdout.isTTY ? 1000 : 15_000);
  }

  markStarted(table: TableInfo) {
    if (this.completed.has(table.key)) return;
    this.lastKey = table.key;
    this.inFlight.push(table);
    // pg_dump does not report per-table completion; with N workers at most N
    // tables are in flight, so the oldest one must be done.
    while (this.inFlight.length > this.jobs) this.markCompleted(this.inFlight[0]);
  }

  markCompleted(table: TableInfo) {
    if (this.completed.has(table.key)) return;
    this.completed.add(table.key);
    this.completedBytes += table.bytes;
    const index = this.inFlight.findIndex((t) => t.key === table.key);
    if (index !== -1) this.inFlight.splice(index, 1);
  }

  setDiskBytes(bytes: number) {
    this.diskBytes = bytes;
  }

  finish() {
    clearInterval(this.timer);
    this.render(true);
    if (process.stdout.isTTY) process.stdout.write("\n");
  }

  abort() {
    clearInterval(this.timer);
    if (process.stdout.isTTY) process.stdout.write("\n");
  }

  private render(final: boolean) {
    let done = this.completedBytes;
    for (const t of this.inFlight) {
      if (!this.completed.has(t.key)) done += t.bytes / 2;
    }
    const frac =
      this.totalBytes <= 0 ? (final ? 1 : 0) : Math.min(done / this.totalBytes, final ? 1 : 0.99);
    const filled = Math.round(frac * BAR_WIDTH);
    const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
    const elapsed = (Date.now() - this.startedAt) / 1000;
    const eta = !final && frac > 0.02 ? fmtDuration((elapsed * (1 - frac)) / frac) : "--";
    const tablesDone = final ? this.tables.length : this.completed.size;

    let line =
      `${this.label} [${bar}] ${String(Math.round(frac * 100)).padStart(3)}%  ` +
      `${fmtBytes(final ? this.totalBytes : done)} / ${fmtBytes(this.totalBytes)}  ` +
      `${tablesDone}/${this.tables.length} tables  ETA ${eta}`;
    if (this.diskBytes > 0) line += `  (${fmtBytes(this.diskBytes)} ${this.diskLabel})`;
    if (!final && this.lastKey) line += `  ${this.lastKey}`;
    if (final) line += `  took ${fmtDuration(elapsed)}`;

    if (process.stdout.isTTY) {
      process.stdout.write(`\r\x1b[2K${line}`);
      return;
    }
    console.log(line);
  }
}

function attachProgressParser(progress: PhaseProgress, tables: TableInfo[]) {
  const byKey = new Map(tables.map((t) => [t.key, t]));
  const byName = new Map<string, TableInfo | null>();
  for (const t of tables) byName.set(t.name, byName.has(t.name) ? null : t);

  const startRe = /(?:dumping contents of table|processing data for table) "([^"]+)"(?:\."([^"]+)")?/;
  const finishRe = /finished item \d+ TABLE DATA (\S+)/;

  return (line: string) => {
    const started = line.match(startRe);
    if (started) {
      const key = started[2] ? `${started[1]}.${started[2]}` : started[1];
      const table = byKey.get(key);
      if (table) progress.markStarted(table);
      return;
    }
    const finished = line.match(finishRe);
    if (!finished) return;
    const table = byName.get(finished[1].replaceAll(`"`, ""));
    if (table) progress.markCompleted(table);
  };
}

function runTool(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  onStderrLine: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    activeChild = child;
    const tail: string[] = [];
    let buffer = "";

    child.stderr.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        tail.push(line);
        if (tail.length > 40) tail.shift();
        onStderrLine(line);
      }
    });
    child.on("error", (error) => {
      activeChild = null;
      reject(new Error(`${command} failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      activeChild = null;
      if (code === 0) return resolve();
      reject(new Error(`${command} exited with code ${code}:\n${tail.join("\n")}`));
    });
  });
}

async function dumpDirBytes(dir: string): Promise<number> {
  const entries = await readdir(dir).catch(() => [] as string[]);
  let total = 0;
  for (const entry of entries) {
    const info = await stat(path.join(dir, entry)).catch(() => null);
    if (info?.isFile()) total += info.size;
  }
  return total;
}

async function activeSlots(sql: Sql): Promise<string[]> {
  const rows = await sql<{ slot_name: string }[]>`
    select slot_name from pg_replication_slots
    where active and database = current_database() order by 1
  `;
  return rows.map((row) => row.slot_name);
}

async function wipeTarget(sql: Sql) {
  const schemas = await sql<{ nspname: string }[]>`
    select nspname from pg_namespace where nspname <> 'information_schema' and nspname !~ '^pg_'
  `;
  for (const row of schemas) {
    await sql`drop schema ${sql(row.nspname)} cascade`;
  }
  await sql`create schema public`;

  const publications = await sql<{ pubname: string }[]>`select pubname from pg_publication`;
  for (const row of publications) {
    await sql`drop publication ${sql(row.pubname)}`;
  }
  const slots = await sql<{ slot_name: string }[]>`
    select slot_name from pg_replication_slots
    where not active and database = current_database() and slot_name ~ ${ZERO_SLOT_PATTERN}
  `;
  for (const row of slots) {
    await sql`select pg_drop_replication_slot(${row.slot_name})`;
  }
}

// zero-cache's publications and event triggers live outside any schema, so
// --exclude-schema misses them; they are cut from the restore list instead.
// TOC lines read `id; catalog oid DESC schema name owner`.
const TOC_LINE = /^\d+; \d+ \d+ ([A-Z][A-Z ]*[A-Z]) \S+ (\S+)/;

function isZeroObject(tocLine: string) {
  const match = tocLine.match(TOC_LINE);
  if (!match) return false;
  const [, desc, name] = match;
  if (desc.startsWith("PUBLICATION")) return ZERO_PUBLICATION_PATTERN.test(name);
  if (desc === "EVENT TRIGGER") return ZERO_EVENT_TRIGGER_PATTERN.test(name);
  return false;
}

async function writeRestoreList(dumpDir: string): Promise<string> {
  const toc = await new Promise<string>((resolve, reject) => {
    const child = spawn("pg_restore", ["--list", dumpDir], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`pg_restore --list exited with code ${code}`))));
  });
  const kept = toc.split("\n").filter((line) => !isZeroObject(line));
  const listPath = path.join(dumpDir, "restore.list");
  await writeFile(listPath, kept.join("\n"));
  return listPath;
}

async function countRows(sql: Sql, table: TableInfo): Promise<number> {
  const [row] = await sql<{ c: string }[]>`
    select count(*)::bigint as c from ${sql(table.schema)}.${sql(table.name)}
  `;
  return Number(row.c);
}

async function verify(sourceSql: Sql, targetSql: Sql, exactCounts: boolean): Promise<boolean> {
  console.log("Analyzing target for row estimates...");
  await targetSql`analyze`;

  const sourceTables = await fetchTables(sourceSql);
  const targetByKey = new Map((await fetchTables(targetSql)).map((t) => [t.key, t]));

  const problems: string[] = [];
  for (const key of targetByKey.keys()) {
    if (!sourceTables.some((t) => t.key === key)) problems.push(`extra table on target: ${key}`);
  }

  let checked = 0;
  for (const source of sourceTables) {
    const target = targetByKey.get(source.key);
    if (!target) {
      problems.push(`missing table on target: ${source.key}`);
      continue;
    }

    const exact = exactCounts || source.bytes <= EXACT_COUNT_MAX_BYTES;
    if (!exact && (source.rows < 0 || target.rows < 0)) {
      console.log(`⚪ ${source.key}: no row estimate available, skipped (use --exact-counts)`);
      continue;
    }

    const [srcRows, tgtRows] = exact
      ? await Promise.all([countRows(sourceSql, source), countRows(targetSql, target)])
      : [source.rows, target.rows];
    const tolerance = Math.max(1000, srcRows * (exact ? EXACT_TOLERANCE : ESTIMATE_TOLERANCE));
    if (Math.abs(srcRows - tgtRows) > tolerance) {
      problems.push(
        `${source.key}: source ${exact ? "has" : "estimates"} ${srcRows} rows, target ${tgtRows}`,
      );
      continue;
    }
    checked++;
  }

  if (problems.length > 0) {
    console.error(`🔴 Verification failed (${checked} table(s) OK):`);
    for (const problem of problems) console.error(`   - ${problem}`);
    return false;
  }
  console.log(
    `🟢 Verified ${checked}/${sourceTables.length} tables (row counts within tolerance; the source is live, so small drift is expected).`,
  );
  return true;
}

async function main() {
  const { values, positionals } = parseArgs({
    // pnpm forwards the "--" separator itself.
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      yes: { type: "boolean", default: false },
      jobs: { type: "string", default: "2" },
      "exact-counts": { type: "boolean", default: false },
      "dump-dir": { type: "string" },
    },
    allowPositionals: true,
  });
  if (positionals.length > 0) {
    fail("Unexpected arguments. URLs are read from SOURCE_DATABASE_URL and TARGET_DATABASE_URL.");
  }
  const jobs = Number(values.jobs);
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8) fail("--jobs must be an integer from 1 to 8.");

  const source = parseDbUrl("SOURCE_DATABASE_URL");
  const target = parseDbUrl("TARGET_DATABASE_URL");
  if (source.host === target.host && source.port === target.port && source.database === target.database) {
    fail(`Source and target are the same database (${source.redacted}).`);
  }

  const sourceSql = await connect(source, "source");
  const targetSql = await connect(target, "target");
  const [sourceMajor, targetMajor, dumpMajor, restoreMajor] = await Promise.all([
    serverMajor(sourceSql),
    serverMajor(targetSql),
    toolMajor("pg_dump"),
    toolMajor("pg_restore"),
  ]);
  const requiredMajor = Math.max(sourceMajor, targetMajor);
  if (dumpMajor < requiredMajor || restoreMajor < requiredMajor) {
    fail(
      `pg_dump/pg_restore are v${Math.min(dumpMajor, restoreMajor)}, but source is Postgres ${sourceMajor} and target is Postgres ${targetMajor}. Install postgresql-client-${requiredMajor}.`,
    );
  }
  if (restoreMajor >= 17 && targetMajor < 17) {
    fail(
      `pg_restore ${restoreMajor} sets transaction_timeout, which Postgres ${targetMajor} rejects. Use postgresql-client-16 for a Postgres ${targetMajor} target.`,
    );
  }

  const targetSlots = await activeSlots(targetSql);
  if (targetSlots.length > 0) {
    fail(
      `Target has active replication slots (${targetSlots.join(", ")}). Stop the zero-cache attached to it first.`,
    );
  }

  const [sizeRow] = await sourceSql<{ s: string }[]>`select pg_database_size(current_database())::bigint as s`;
  const dbBytes = Number(sizeRow.s);
  const tables = await fetchTables(sourceSql);
  const zeroSchemas = await fetchZeroSchemas(sourceSql);

  const extensions = await sourceSql<{ extname: string }[]>`select extname from pg_extension where extname <> 'plpgsql'`;
  if (extensions.length > 0) {
    console.warn(
      `🟡 Source uses extensions: ${extensions.map((row) => row.extname).join(", ")} — they must be installable on the target.`,
    );
  }

  const dumpBase = values["dump-dir"] ?? os.tmpdir();
  const fsInfo = await statfs(dumpBase).catch(() => fail(`--dump-dir ${dumpBase} does not exist.`));
  const freeBytes = fsInfo.bavail * fsInfo.bsize;
  if (freeBytes < dbBytes) {
    fail(
      `Not enough disk for the dump: need up to ${fmtBytes(dbBytes)}, ${fmtBytes(freeBytes)} free in ${dumpBase}. Point --dump-dir at a bigger disk.`,
    );
  }
  const dumpDir = path.join(dumpBase, `sync-database-${new Date().toISOString().replaceAll(":", "-")}`);
  keptDumpDir = dumpDir;

  console.log(`Source: ${source.redacted}  (Postgres ${sourceMajor}, ${fmtBytes(dbBytes)}, ${tables.length} tables)`);
  if (zeroSchemas.length > 0) console.log(`Skipping zero-cache state: ${zeroSchemas.join(", ")}`);
  console.log(`Target: ${target.redacted}  (Postgres ${targetMajor}) — ALL DATA ON THE TARGET WILL BE WIPED`);
  if (!values.yes) {
    if (!process.stdin.isTTY) fail("Not a terminal; pass --yes to skip confirmation.");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Type "yes" to continue: `);
    rl.close();
    if (answer.trim() !== "yes") fail("Aborted, nothing was touched.");
  }

  console.log(`Dumping to ${dumpDir} with ${jobs} job(s)...`);
  const dumpProgress = new PhaseProgress("Dumping  ", tables, jobs, "written");
  const dumpPoll = setInterval(() => {
    void dumpDirBytes(dumpDir).then((bytes) => dumpProgress.setDiskBytes(bytes));
  }, 2000);
  try {
    await runTool(
      "pg_dump",
      [
        "--format=directory",
        `--jobs=${jobs}`,
        "--compress=1",
        "--no-owner",
        "--no-acl",
        "--verbose",
        ...zeroSchemas.map((schema) => `--exclude-schema=${quotePattern(schema)}`),
        `--file=${dumpDir}`,
      ],
      toolEnv(source),
      attachProgressParser(dumpProgress, tables),
    );
    dumpProgress.finish();
  } catch (error) {
    dumpProgress.abort();
    throw error;
  } finally {
    clearInterval(dumpPoll);
  }

  const listPath = await writeRestoreList(dumpDir);

  console.log(`Wiping target ${target.redacted}...`);
  await wipeTarget(targetSql);

  console.log(`Restoring with ${jobs} job(s)...`);
  const restoreProgress = new PhaseProgress("Restoring", tables, jobs, "read");
  try {
    await runTool(
      "pg_restore",
      [
        "--format=directory",
        `--jobs=${jobs}`,
        "--no-owner",
        "--no-acl",
        "--exit-on-error",
        "--verbose",
        `--use-list=${listPath}`,
        `--dbname=${target.database}`,
        dumpDir,
      ],
      toolEnv(target),
      attachProgressParser(restoreProgress, tables),
    );
    restoreProgress.finish();
  } catch (error) {
    restoreProgress.abort();
    console.error(`🔴 Restore failed — the target (${target.redacted}) is incomplete. Fix the issue and rerun.`);
    throw error;
  }

  const ok = await verify(sourceSql, targetSql, values["exact-counts"]);
  if (!ok) {
    console.error(`Dump kept at ${dumpDir}`);
    process.exitCode = 1;
    return;
  }

  await rm(dumpDir, { recursive: true, force: true });
  keptDumpDir = null;
  console.log(`🟢 Done. ${source.redacted} → ${target.redacted}`);
  console.log("Start the target's zero-cache with a fresh replica file so it re-syncs from the new data.");
}

let keptDumpDir: string | null = null;
try {
  await main();
} catch (error) {
  console.error(`🔴 ${(error as Error).message}`);
  if (keptDumpDir) console.error(`Dump kept at ${keptDumpDir} (it is a valid backup of the source).`);
  process.exitCode = 1;
} finally {
  process.exit(process.exitCode ?? 0);
}
