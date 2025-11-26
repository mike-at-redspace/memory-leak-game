/**
 * Full registry of collectible items with descriptions, scores, and boost
 * flags.
 *
 * @type {ReadonlyArray<{
 *   id: string
 *   emoji: string
 *   name: string
 *   score: number
 *   rarity: number
 *   health?: number
 *   isBoost?: boolean
 *   isSlow?: boolean
 * }>}
 */
export const ITEM_REGISTRY = Object.freeze([
  {
    id: 'gpu',
    emoji: '📼',
    name: 'RTX 5090 (Paid with Vital Organs)',
    score: 800,
    rarity: 0.008
  },
  {
    id: 'linux',
    emoji: '🐧',
    name: 'Custom Linux Build (Held Together by Dotfiles)',
    score: 600,
    rarity: 0.01,
    health: 128
  },
  {
    id: 'offer',
    emoji: '💰',
    name: 'FAANG Job Offer',
    score: 1000,
    rarity: 0.01
  },
  {
    id: 'server',
    emoji: '🗄️',
    name: 'Uptime: 99.9999% (Admin Ascended)',
    score: 500,
    rarity: 0.012
  },
  {
    id: 'css',
    emoji: '🖌️',
    name: 'Perfectly Centered <div>',
    score: 450,
    rarity: 0.015
  },
  {
    id: 'hotfix',
    emoji: '⚡',
    name: 'Hotfix in Production (And It Actually Worked)',
    score: 650,
    rarity: 0.01
  },
  {
    id: 'compile',
    emoji: '🧱',
    name: 'Build Succeeded on First Try',
    score: 700,
    rarity: 0.009
  },
  {
    id: 'monitor',
    emoji: '🖥️',
    name: 'Dual Vertical Monitors',
    score: 350,
    rarity: 0.015
  },
  {
    id: 'laptop',
    emoji: '💻',
    name: 'MacBook Pro M5 (Your Wallet Cried)',
    score: 350,
    rarity: 0.015
  },
  {
    id: 'keeb',
    emoji: '⌨️',
    name: 'Custom Thockboard (ASMR Edition)',
    score: 250,
    rarity: 0.02
  },
  {
    id: 'headphones',
    emoji: '🎧',
    name: 'Noise Cancelling (Silences Real Life)',
    score: 200,
    rarity: 0.025
  },
  {
    id: 'pi',
    emoji: '🥧',
    name: "Raspberry Pi (Project You'll Never Start)",
    score: 150,
    rarity: 0.03
  },
  {
    id: 'chair',
    emoji: '🪑',
    name: 'Ergo Chair (Posture +200%)',
    score: 180,
    rarity: 0.025
  },
  {
    id: 'standupdesk',
    emoji: '📈',
    name: 'Standing Desk (Focus Multiplier)',
    score: 160,
    rarity: 0.03
  },
  {
    id: 'energy',
    emoji: '🥤',
    name: 'Red Bull IV Drip (No Sleep Mode)',
    score: 100,
    rarity: 0.03,
    isBoost: true
  },
  {
    id: 'copilot',
    emoji: '🤖',
    name: 'Copilot Wrote Everything',
    score: 200,
    rarity: 0.02,
    isBoost: true
  },
  {
    id: 'fiber',
    emoji: '🚀',
    name: '10Gbps Fiber (Latency? Never Heard of Her)',
    score: 200,
    rarity: 0.02,
    isBoost: true
  },
  {
    id: 'mouse',
    emoji: '🖱️',
    name: 'MX Master (Productivity Overlord)',
    score: 150,
    rarity: 0.025,
    isBoost: true
  },
  {
    id: 'darkmode',
    emoji: '🌙',
    name: 'Dark Mode (Instant 10x Developer Mode)',
    score: 150,
    rarity: 0.03,
    isBoost: true
  },
  {
    id: 'focus',
    emoji: '🎯',
    name: 'Flow State Achieved',
    score: 180,
    rarity: 0.025,
    isBoost: true
  },
  {
    id: 'cleanbuild',
    emoji: '🧼',
    name: 'Clean Build Cache (Everything Feels Faster)',
    score: 140,
    rarity: 0.03,
    isBoost: true
  },
  {
    id: 'coffee',
    emoji: '☕',
    name: 'Coffee (Programmer Blood Type)',
    score: 50,
    rarity: 0.06,
    health: 40
  },
  {
    id: 'pizza',
    emoji: '🍕',
    name: 'Hackathon Pizza (Cold but Powerful)',
    score: 50,
    rarity: 0.05,
    health: 64
  },
  {
    id: 'rubberduck',
    emoji: '🦆',
    name: 'Rubber Duck Debugging Session',
    score: 50,
    rarity: 0.05,
    health: 16
  },
  {
    id: 'restart',
    emoji: '🔁',
    name: 'Classic IT Fix (Turn It Off & On)',
    score: 100,
    rarity: 0.03,
    health: 16
  },
  {
    id: 'docker',
    emoji: '🐳',
    name: '"Works in Docker" Miracle',
    score: 150,
    rarity: 0.03,
    health: 16
  },
  {
    id: 'freshair',
    emoji: '🌿',
    name: 'Touch Grass (Mental RAM Restored)',
    score: 40,
    rarity: 0.06,
    health: 32
  },
  {
    id: 'sleep',
    emoji: '🛌',
    name: 'Actual Full Night of Sleep',
    score: 80,
    rarity: 0.055,
    health: 48
  },
  {
    id: 'git',
    emoji: '🌳',
    name: 'Pristine Git History (A Rare Sight)',
    score: 120,
    rarity: 0.03
  },
  {
    id: 'json',
    emoji: '📄',
    name: 'JSON That Actually Parses',
    score: 80,
    rarity: 0.04
  },
  {
    id: 'npm',
    emoji: '📦',
    name: 'npm install (Summons Half the Internet)',
    score: 50,
    rarity: 0.04
  },
  {
    id: 'todo',
    emoji: '📋',
    name: "// TODO: (Future You's Problem)",
    score: 30,
    rarity: 0.05
  },
  {
    id: 'localhost',
    emoji: '🏠',
    name: '"Works on Localhost" Badge',
    score: 40,
    rarity: 0.04
  },
  {
    id: 'comment',
    emoji: '💬',
    name: 'PR Comment Explaining the Magic Number',
    score: 60,
    rarity: 0.045
  },
  {
    id: 'cache',
    emoji: '🧹',
    name: 'Cleared Cache, Still Broken',
    score: 55,
    rarity: 0.045
  },
  {
    id: 'jira',
    emoji: '🎫',
    name: 'New Jira Notification',
    score: 10,
    rarity: 0.05,
    isSlow: true
  },
  {
    id: 'meeting',
    emoji: '📅',
    name: "Meeting That Could've Been an Email",
    score: 10,
    rarity: 0.04,
    isSlow: true
  },
  {
    id: 'unplugged',
    emoji: '🔌',
    name: 'Unplugged Server (Surprise Downtime!)',
    score: 50,
    rarity: 0.03,
    isSlow: true
  },
  {
    id: 'slackspam',
    emoji: '📣',
    name: '87 Unread Slack Notifications',
    score: 20,
    rarity: 0.035,
    isSlow: true
  },
  {
    id: 'printer',
    emoji: '🖨️',
    name: 'Printer Offline (Again!)',
    score: 15,
    rarity: 0.04,
    isSlow: true
  },
  {
    id: 'deployfail',
    emoji: '🛑',
    name: 'Prod Deploy Failed (30MB Stacktrace of Doom)',
    score: 40,
    rarity: 0.025,
    isSlow: true
  },
  {
    id: 'ticketstorm',
    emoji: '🗃️',
    name: 'Unexpected Ticket Avalanche',
    score: 25,
    rarity: 0.03,
    isSlow: true
  },
  {
    id: 'bsod',
    emoji: '🟦',
    name: 'BSOD (Your Soul Exits the Body)',
    score: 0,
    rarity: 0.02,
    health: -150
  },
  {
    id: 'dns',
    emoji: '🌐',
    name: "It's ALWAYS DNS",
    score: 20,
    rarity: 0.035,
    health: -40
  },
  {
    id: 'cors',
    emoji: '🚧',
    name: 'CORS Error (Fun Ends Here)',
    score: 20,
    rarity: 0.04,
    health: -30
  },
  {
    id: 'node_modules',
    emoji: '🕳️',
    name: 'Deleting node_modules… Forever',
    score: 10,
    rarity: 0.05,
    health: -20
  },
  {
    id: 'syntax',
    emoji: '‼️',
    name: 'Syntax Error at 3am',
    score: 10,
    rarity: 0.04,
    health: -25
  },
  {
    id: 'merge',
    emoji: '⚔️',
    name: 'Merge Conflict (Choose Your Fighter)',
    score: 20,
    rarity: 0.03,
    health: -50
  },
  {
    id: 'deprecated',
    emoji: '📛',
    name: 'Deprecated Dependency (Good Luck)',
    score: 10,
    rarity: 0.05,
    health: -35
  },
  {
    id: 'wifi',
    emoji: '🛜',
    name: 'Wi-Fi Drops During Outage',
    score: 10,
    rarity: 0.045,
    health: -20
  }
])
