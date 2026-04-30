const commits = [
  {
    hash: 'c1',
    message: 'Initial commit',
    timestamp: 1,
    files: [
      { path: 'src/index.js', content: "console.log('hello world')" },
      { path: 'src/app.js', content: "export default function App() { return 'app' }" }
    ]
  },
  {
    hash: 'c2',
    message: 'Add utils',
    timestamp: 2,
    files: [
      { path: 'src/index.js', content: "console.log('hello world')" },
      { path: 'src/app.js', content: "export default function App() { return 'app v2' }" },
      { path: 'src/utils.js', content: "export const add = (a,b)=>a+b" }
    ]
  },
  {
    hash: 'c3',
    message: 'Refactor app',
    timestamp: 3,
    files: [
      { path: 'src/index.js', content: "console.log('hello world updated')" },
      { path: 'src/app.js', content: "export default function App() { return 'app v3' }" },
      { path: 'src/utils.js', content: "export const add = (a,b)=>a+b" }
    ]
  }
]

export default { commits }
