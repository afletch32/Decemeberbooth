# Photobooth setup notes

## Node version
This project requires Node 18 or newer. Tests rely on built-in `fetch`, `FormData`, and `Blob` globals that are only available in Node 18+ runtimes. Run `npm test` with Node 18 to avoid missing-global failures.
