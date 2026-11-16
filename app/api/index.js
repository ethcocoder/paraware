let appPromise = null;
let startupError = null;

function loadApp() {
  if (!appPromise) {
    appPromise = import('../server/index.js')
      .then((module) => module.app || module.default)
      .catch((error) => {
        startupError = error;
        console.error('Paraware API failed to initialize:', error);
        return null;
      });
  }
  return appPromise;
}

export default async function handler(req, res) {
  const app = await loadApp();
  if (!app) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'The Paraware API failed to start.',
        reason: startupError ? String(startupError.message || startupError) : null,
      })
    );
    return;
  }
  return app(req, res);
}
