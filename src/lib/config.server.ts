import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// Keep frontend bundles limited to public Supabase URL/anon key only.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
  };
}
