'use strict';
const Discord = require('discord.js'),
    mysql = require('mysql'),
    fs = require('fs'),
    env = process.env;
require('dotenv').config();

function handleDisconnect() {
    global.sql = mysql.createConnection({
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
    });

    sql.connect(function (err) {
        if (err) {
            console.log('ERROR.CONNECTION_DB: ', err);
            setTimeout(handleDisconnect, 1000);
        }
    });

    sql.on('error', function (err) {
        console.log('ERROR.DB: ', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('ERROR.CONNECTION_LOST: ', err);
            handleDisconnect();
        } else {
            throw err;
        }
    });
}
handleDisconnect();

global.client = new Discord.Client({ ws: { intents: Discord.Intents.ALL }, restTimeOffset: 100 });
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

global.colors = {
    green: 0x43b581,
    orange: 0xfaa61a,
    red: 0xf04747
}

global.rec_connections = {};
global.play_connections = [];

client.once('ready', async () => {
    await client.user.setActivity(`@${client.user.username} help`, { type: 'PLAYING' })

    if (!fs.existsSync('./record')) fs.mkdirSync('./record');

    global.helps = client.commands.filter( command => !command.hidden ).map( command => {
        if (command.hidden) return;
        return {
            name: command.name,
            aliases: command.aliases,
            args: command.args,
            description: command.description
        }
    });

    console.log('voice: 準備完了');
});

client.on('voiceStateUpdate', oldState => {
    if (!oldState.channel) return;

    const connection = client.voice.connections.get(oldState.channel.guild.id);
    if (!connection) return;

    if ((rec_connections[connection.channel.guild.id] &&
        rec_connections[connection.channel.guild.id].length) ||
        play_connections.includes(connection.channel.guild.id)) return;

    if (connection.channel.members.size <= 1) connection.disconnect();
});

client.on('message', async message => {
    if (message.author.bot) return;

    const guild_flag = message.guild && message.guild.available;
    let prefix = guild_flag && message.guild.me.nickname ? `@${message.guild.me.nickname} ` : `@${client.user.username} `;
    if (guild_flag && message.guild.me.nickname) {
        const match = message.guild.me.nickname.match(/\[(.*)]/);
        if (match) {
            const trim = match[1].trim();
            if (trim) prefix = trim;
        }
    }

    const mention_match = message.content.match(/^<@(!|&|)(\d{17,})>/);
    if (mention_match) {
        if (client.user.id === mention_match[2] ||
            message.mentions.roles.some( role =>
                role.id === mention_match[2] &&
                role.members.has(client.user.id) &&
                role.members.size === 1
            )
        ){
            message.content = message.content.slice(mention_match[0].length);
        } else return;
    } else if (message.content.startsWith(prefix)) {
        message.content = message.content.slice(prefix.length);
    } else return;

    const args = message.content.trim().split(/ +/),
        commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    try {
        await command.execute(message, args, prefix);
    } catch (error) {
        console.log(error.stack);

        let icon = client.user.avatarURL({ format: 'png', dynamic: true, size:2048 }),
            channel_name = client.user.username,
            guild_name = 'DM';

        if (message.guild && message.guild.available) {
            icon = message.guild.iconURL({ format: 'png', dynamic: true, size:2048 });
            channel_name = message.channel.name;
            guild_name = message.guild.name;
        }

        const embed = {
            color: colors.red,
            title: `${command.name}にて例外発生`,
            author: {
                name: message.author.tag,
                icon_url: message.author.avatarURL({ format: 'png', dynamic: true, size:2048 }),
                url: message.author.avatarURL({ format: 'png', dynamic: true, size:2048 }),
            },
            description: `${message.content}\n\`\`\`${error.stack}\`\`\``,
            timestamp: new Date(),
            footer: {
                text: `\n${channel_name} in ${guild_name}`,
                icon_url: icon
            },
        };
        console.log(embed);

        const log_channel = client.channels.cache.get(env.LOG_CHANNEL);
        if (log_channel) await log_channel.send({embed:embed});
        await message.channel.send({
            embed:{
                color: colors.red,
                title: `予期しない例外が発生しました`,
                description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`
            }
        });
    }

});

client.login(env.TOKEN);