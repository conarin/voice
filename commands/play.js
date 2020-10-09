'use strict';
const Discord = require('discord.js');
module.exports = {
    name: 'play',
    aliases: ['再生'],
    args: ['<id>'],
    description: [
        '録音したデータを再生します。',
        'ボイスチャンネルに接続した状態で実行してください。',
        'ギルド以外や誰かが録音,再生中はご利用になれません。'
    ],
    async execute(message, args, prefix) {

        const embed = {
            title: 'idを指定してください',
            description: `${prefix}play <id>`,
            color: colors.orange
        };

        if (!/^[1-9]\d*$/.test(args[0])) return message.channel.send({embed: embed});

        const connection = await client.commands.get('join').execute(message, true);
        if (!connection) return;

        if (rec_connections[message.guild.id] && rec_connections[message.guild.id].length) {
            return message.channel.send({embed: {
                    title: '録音中です',
                    description: `録音が終了してからコマンドを入力してください。`,
                    color: colors.orange
                }
            });
        }

        const res = await new Promise(resolve => {
            sql.query('SELECT * FROM voice.record WHERE id=?', args[0], (error, results) => {
                if (error) {
                    console.log('select error: ' + error);
                    embed.title = 'データの取得に失敗しました';
                    embed.description = `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`;
                    embed.color = colors.red;
                    resolve(null);
                } else {
                    if (!results.length) {
                        embed.title = '指定されたidは存在しません';
                        embed.description = 'idをご確認の上、再度コマンドを入力してください。';
                        resolve(null);
                    } else {
                        resolve(results[0]);
                    }
                }
            });
        });

        if (!res) return message.channel.send({embed: embed});

        if (res.user_id !== message.author.id) {
            return message.channel.send({embed: {
                    title: '他人の音声を再生することはできません',
                    description: `ご自身の録音時に発行されたidを入力してください。`,
                    color: colors.orange
                }
            });
        }

        if (play_connections.includes(message.guild.id)) {
            return message.channel.send({embed: {
                    title: '再生中です',
                    description: `再生が終了してからこのコマンドを入力してください。`,
                    color: colors.orange
                }
            });
        } else play_connections.push(message.guild.id);

        embed.title = `id: ${res.id}を再生します`;
        embed.description = res.note;
        embed.timestamp = Discord.SnowflakeUtil.deconstruct(res.file_id).date;
        embed.color = colors.green;
        const msg = await message.channel.send({embed: embed});

        connection.play(`https://cdn.discordapp.com/attachments/${res.channel_id}/${res.file_id}/${res.file_name}.mp3`)
            .on('speaking', speaking => {
                if (speaking) return;

                const index = play_connections.indexOf(message.guild.id);
                if (index !== -1) play_connections.splice(index, 1);

                embed.title = `id: ${res.id}を再生しました`;
                msg.edit({embed: embed});

                if (connection && connection.channel.members.size <= 1) connection.disconnect();
            });

        connection
            .on('error', error => {
                console.log(error.stack);
            })
            .on('disconnect', () => {
                const index = play_connections.indexOf(message.guild.id);
                if (index !== -1) play_connections.splice(index, 1);
            });

    },
};