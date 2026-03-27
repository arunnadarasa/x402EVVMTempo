export default defineEventHandler((event) => {
  if (event.method == "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  return
});
