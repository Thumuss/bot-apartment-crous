import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import { parse } from "node-html-parser";
import cron from "node-cron";

const bot = new Client({ intents: Object.keys(GatewayIntentBits) });

const URL = Bun.env.URL;

const channel = Bun.env.CHANNEL;
let textChannel: TextChannel;

const reg = new RegExp("[0-9]+");

async function checkWebsite(uri = URL) {
  if (!uri) {
    throw new Error("URI Not Found");
  }

  const request = await fetch(uri);

  if (request.status !== 200) {
    throw new Error(`Error Status Fetch: ${request.status}, not == to 200`);
  }

  const data = await request.text();

  const text = parse(data).querySelector(".SearchResults-mobile")
    ?.text as string;

  const result = reg.exec(text);

  return result ? parseInt(result[0]) : 0;
}

cron.schedule("* * */3 * *", async () => {
  const num = await checkWebsite();
  textChannel.send(`${num} appartements trouvé`);
});

bot.on("ready", async () => {
  if (channel) textChannel = (await bot.channels.fetch(channel)) as TextChannel;
  console.log("* Ready");
});

bot.on("messageCreate", async (message) => {
  if (message.author.bot || message.webhookId) return;

  const args = message.cleanContent.split(" ");

  if (args[0].startsWith("%%check")) {
    const num = await checkWebsite(args[1] || URL);
    message.reply(`${num} appartement(s) trouvé`);
  }
});

bot.login(Bun.env.TOKEN);
