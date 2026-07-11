export default {
  name: "echo",

  aliases: [],

  description: "Print text to the terminal",

  usage: "echo <text>",

  examples: [
    "echo hello",
    'echo "hello world"'
  ],

  // execute({ args, terminal }) {
  execute({ args }) {
    // terminal.print(args.join(" "));
    console.log(args.join(" "))
  }
};