/**
 * The FAQ: the questions a newcomer asks before starting, each answered in a few lines (cost, a graphics card, the
 * other folders, removing it), then the practical questions no other page answers. What Clank is, why, and how to
 * start are on Why Clank, Features and Get started.
 */
export const FAQ_GROUPS = [
  {
    id: 'before',
    title: 'Before you start',
    items: [
      {
        q: 'Is Clank free?',
        a: 'Yes: Clank is free and open source (AGPL-3.0). A model on your own GPU costs nothing per request. A cloud model costs what its provider charges, through OpenRouter, and OpenRouter also has free models.',
      },
      {
        q: 'What will a cloud model cost me?',
        a: "Each request's cost shows as it happens: on the header, in Requests (F7) and with `clank cost`. Set a daily or a monthly limit (L, or `clank cost limit`), and cloud requests pause when it is reached, until you raise it. Free models cost nothing, but take 50 requests a day until you have bought 10 credits once, then 1,000; an agent's task can take dozens of requests.",
      },
      {
        q: 'Do I need a graphics card?',
        a: "Not for a cloud model: Clank then needs only Docker and an OpenRouter key. A model on your own computer needs an NVIDIA GPU; the 27B model with its full 262,144-token window runs on a 16 GB card.",
      },
      {
        q: 'Can the agent touch my other folders?',
        a: "No. The agent works in a Docker container that sees only the folder you opened it in, mounted at /workspace; the rest of your computer is not in it.",
      },
      {
        q: 'How do I remove it?',
        a: 'Get started says how, step by step, in its Uninstalling section: Clank with two commands (`clank stop`, then `uv tool uninstall clank`), then, if you want, its folder (~/.clank), its containers and image, and what the installer added.',
      },
    ],
  },
  {
    id: 'working',
    title: 'Working with Clank',
    items: [
      {
        q: 'Does Clank replace OpenCode?',
        a: "No. Clank runs OpenCode, in a Docker workspace for each folder, and controls the model it talks to. You work in OpenCode as you would anyway, in a terminal or in Clank's VS Code window; Clank sets it up, watches it and steers it.",
      },
      {
        q: 'Can I work in several folders at once?',
        a: 'Yes. Each folder gets its own workspace, a container of its own, and its own OpenCode window. Workspaces (F6) lists them all.',
      },
      {
        q: 'Can the agent reach the internet?',
        a: "Only through Clank, and only to the hosts you allow for that folder. Its container sees only the folder and has no route out of its own; a host it asks for waits while Clank asks you, and every exchange is logged (`clank network log`).",
      },
      {
        q: 'Can the agent use my MCP servers?',
        a: "Yes. Add yours on MCP servers (F3) and give them to the agent from This folder (m); a folder's own .mcp.json once you allow it. Each runs in the workspace's container, and one marked local is never offered to a cloud model.",
      },
      {
        q: 'Can I use Clank over SSH?',
        a: "Yes. The console runs in an SSH terminal, and a flow can be built with the model and run from there without the computer's own screen.",
      },
    ],
  },
  {
    id: 'changing',
    title: 'Changing Clank',
    items: [
      {
        q: "Where are Clank's settings?",
        a: "In readable files: a preset for each way to run a model, the context margin in the agent's configuration, the cost limits, the console's colors in its style files. Every choice Clank makes for you is shown where it applies, and can be overridden.",
      },
      {
        q: 'Where do I report a problem?',
        a: "In the repository's issues on GitHub, with what you did, what you saw, and what clank doctor says. A security problem goes by SECURITY.md instead, not in an issue.",
      },
      {
        q: 'Can I change how the console looks?',
        a: "Yes. Every part of the console is a named element in a style file, changeable in the settings, and the console's documentation says where each thing on screen comes from and what to edit to change it.",
      },
    ],
  },
];
