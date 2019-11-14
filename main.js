const Discord = require("discord.js");
const Enmap = require("enmap");
const file = require("file");
const fs = require("fs");
const Jikan = require('jikan-node');
const Hashids = require('hashids/cjs')
const moment = require("moment");

const client = new Discord.Client();
const config = require("./config.js");
const utils = require("./utils.js");

// Bind variables to client for easy access

client.config = config;

client.dbM = new Enmap({name: "points"});           // database of members
client.dbI = new Enmap({name: "db"});               // database of information

client.mal = new Jikan();                           // MyAnimeList API
client.hashids = new Hashids("LHS Anime Club");     // Unique id generator
client.after = "";                                  // For meme command

client.utils = utils;

// On bot ready

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Fetch role assignment message
    client.channels.get(client.config.rolesChannelID).fetchMessage(client.config.rolesMessageID);
    client.dbI.ensure("mutes", []);
    client.dbI.ensure("activecodes", []);

    // Check for mutes every 10 seconds
    setInterval(() => {
        const mutes = client.dbI.get("mutes");
        let idx = 0;
        for (const mute of mutes) {
            const date = moment(mute.end);
            const guild = client.guilds.get(mute.guild);
            const member = guild.members.get(mute.user);
            const mutedRole = guild.roles.get("636807183358754816");

            if (moment().diff(date) >= 0) {
                member.removeRole(mutedRole);
                mutes.splice(idx);
                idx--;
                member.user.send("You have been unmuted.");
            }

            idx++;
        }
        client.dbI.set("mutes", mutes);
    }, 10000);

    // Check for codes every 1 minute
    setInterval(() => {
        const activecodes = client.dbI.get("activecodes");
        let idx = 0;
        for (const activecode of activecodes) {
            const date = moment(activecode.end);
            const event = guild.members.get(activecode.event);

            if (moment().diff(date) >= 0) {
                activecodes.splice(idx);
                idx--;
                client.channels.get("644074619556593667").send(`Event **${event}** was deactivated after timer expired.`);
            }

            idx++;
        }
        client.dbI.set("activecodes", activecodes);
    }, 60000);
});

// Load events

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    let eventName = file.split(".")[0];
    client.on(eventName, event.bind(null, client));
}

// Load commands

client.commands = new Enmap();

file.walk("./commands", (a, dirPath, dirs, files) => {
    for (const file of files) {
        console.log(`Attempting to load command file ./${file}`);
        const command = require(`./${file}`);
        if (command.hasOwnProperty("name")) {
            client.commands.set(command.name, command);
        }
    }
});

// Login with token

client.login(config.token);