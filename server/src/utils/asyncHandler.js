/** Wrap an async Express handler and forward rejected promises to error middleware. */
export default function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
