# StudyPilot

StudyPilot is a polished, static study planner for college students. Add tasks, track progress, generate a focused plan for today, and keep everything in your browser with `localStorage`.

Its differentiator is WebMCP: in supporting browsers, AI agents can operate the same study planner through explicit, structured browser tools. This lets an agent add, inspect, complete, delete, and prioritize study tasks without fragile UI automation.

## WebMCP tools

The app uses `document.modelContext.registerTool` to register these tools when WebMCP is available:

- `add_study_task` — add a task with title, subject, date, priority, and estimated minutes.
- `get_study_tasks` — retrieve tasks, optionally filtering by date and completion state.
- `complete_study_task` — complete a task by ID.
- `delete_study_task` — delete a task by ID.
- `generate_study_plan` — return incomplete tasks ordered by priority then duration for a date.

Every tool returns an object with a `success` flag plus clear data or error details. The header displays **WebMCP Ready** when `document.modelContext` is provided by the browser; otherwise the normal planner still works.

## Run locally

No installation or build step is required. From this folder, run either:

```bash
python3 -m http.server 8000
```

or:

```bash
npx serve .
```

Then open [http://localhost:8000](http://localhost:8000).

## Test it

1. Add a task and refresh the page — it remains because tasks are stored in `localStorage`.
2. Mark a task complete, delete a task, and generate today’s plan from the main button.
3. In a WebMCP-capable browser/agent environment, open the app and confirm the header says **WebMCP Ready**. The five tools above should be discoverable and callable. Their source registrations are in `app.js`.

For an automated WebMCP smoke test, inject a `document.modelContext` test double with a `registerTool` function before loading `app.js`, then assert it receives all five tool names.

## Deploy

This is a static website. Upload these files directly to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static host. There is no server, database, environment variable, or build command required. Set the publish directory to the repository root.

## Files

- `index.html` — application structure
- `style.css` — responsive visual design
- `app.js` — task logic, persistence, dashboard, and WebMCP tools

## License

MIT — see [LICENSE](LICENSE).
