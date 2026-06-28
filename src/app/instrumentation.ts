export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') return;
  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return;
    orig(...args);
  };
}