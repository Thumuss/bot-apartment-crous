import { Client, GatewayIntentBits, TextChannel, User } from "discord.js";
import { parse } from "node-html-parser";
import { CronJob } from "cron";
const { $ } = Bun;

const bot = new Client({ intents: Object.keys(GatewayIntentBits) });

//* SETUP ENV

const URL = Bun.env.BLC_URL;

const authorsToPingText: string[] = Bun.env.BLC_AUTHORS
  ? Bun.env.BLC_AUTHORS.split(";")
  : [];
let authorsToPing: User[];

interface Hist {
  date: Date;
  number: number;
  text: string;
  URL: string;
}

const maxHistory = Bun.env.BLC_MAX_HISTORY
  ? parseInt(Bun.env.BLC_MAX_HISTORY)
  : 100;
const history: Hist[] = [];

const channel = Bun.env.BLC_CHANNEL;
let textChannel: TextChannel;

const lang = Bun.env.BLC_LANG || "fr-FR";
const file = (await $`cat text.json`.quiet()).json();
const text: { [index: string]: string } = file[lang] ?? file["fr-FR"];

const reg = new RegExp("[0-9]+");

const prefix = Bun.env.BLC_PREFIX ?? "%%";

const cronBackup = Bun.env.BLC_CRON_BACKUP ?? "0 0 */12 * * *";
const cronCheck = Bun.env.BLC_CRON_CHECK ?? "0 */12 * * * *";
const cronTimezone = Bun.env.BLC_TIMEZONE ?? "America/Los_Angeles";

//* END SETUP ENV

const replaceText = (txt: string, numb = 0) =>
  txt
    .replaceAll("%nb", numb.toString())
    .replaceAll("%authors", authorsToPing.map((a) => `<@${a.id}>`).join(" "));

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

  const hist: Hist = {
    date: new Date(),
    number: result ? parseInt(result[0]) : 0,
    text: text,
    URL: uri,
  };

  while (history.length >= maxHistory) {
    history.shift();
  }

  history.push(hist);

  return hist.number;
}

async function cronBackupHistory() {
  await $`mkdir -p logs`;
  await $`echo "${history
    .map(
      (a) =>
        `${a.date.toLocaleDateString()}: ${a.number} in ${a.URL} with '${
          a.text
        }'`
    )
    .join("\n")}" > logs/${Date.now()}.log`;
}

async function cronCheckWebsite() {
  const num = await checkWebsite();
  if (
    history.length >= 2 &&
    (history.at(-1)?.number as number) > (history.at(-2)?.number as number)
  ) {
    textChannel.send(replaceText(text.newApartment, num));
    return;
  }
  textChannel.send(replaceText(text.noNewApartment, num));
}

new CronJob(cronBackup, cronBackupHistory, null, true, cronTimezone);
new CronJob(cronCheck, cronCheckWebsite, null, true, cronTimezone);

bot.on("ready", async () => {
  console.log("* Fetching...");
  if (channel) textChannel = (await bot.channels.fetch(channel)) as TextChannel;
  authorsToPing = await Promise.all(
    authorsToPingText.map((a) => bot.users.fetch(a))
  );
  console.log("* Ready");
});

bot.on("messageCreate", async (message) => {
  if (message.author.bot || message.webhookId) return;

  const args = message.cleanContent.split(" ");
  const commandWPrefix = args.shift();
  if (!commandWPrefix?.startsWith(prefix)) return;
  const command = commandWPrefix.slice(prefix.length);

  if (command == "check") {
    const num = await checkWebsite(args[1] || URL);
    if (
      history.length >= 2 &&
      (history.at(-1)?.number as number) > (history.at(-2)?.number as number)
    ) {
      return message.reply(replaceText(text.newApartment, num));
    }
    message.reply(replaceText(text.noNewApartment, num));
  }

  if (command == "history") {
    console.log(history);
  }
});

bot.login(Bun.env.BLC_TOKEN);
