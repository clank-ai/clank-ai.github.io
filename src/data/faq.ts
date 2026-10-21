/**
 * The FAQ: only questions no other page answers. What Clank is, why, and how to start are on
 * Why Clank, Features and Get started; these are the practical questions left over.
 */
export const FAQ_GROUPS = [
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
        a: "No. Its container sees only the folder and reaches only the model, through Clank's gateway; it has no route out. A folder's software is installed from a container of its own, made for the setup and removed after it. Access to chosen hosts is on the roadmap (M7).",
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
