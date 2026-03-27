export const colors = {
  reset: "\x1b[0m",
  grey: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("afterResponse", (event) => {
    const code = event.node.res.statusCode;
    const method = event.method;
    const [path, _query] = event.path.split("?");
    console.log(
      `${colors.green}${code} ${colors.cyan}${method} ${colors.reset}${path}`,
    );
  });

  nitro.hooks.hook("error", (error, context) => {
    console.trace(error);
    console.error(
      `${colors.red}[error]: ${error.message} at ${context.event?.path}${colors.reset}`,
    );
  });
});
