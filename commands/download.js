'use strict';
const Discord = require('discord.js'),
    moment = require('moment');
module.exports = {
    name: 'download',
    aliases: ['dl', 'send', 'file', 'ダウンロード', '送信', 'ファイル'],
    args: ['<id>'],
    description: [
        '録音したデータを送信します。',
        '誤って送信してしまった場合は、10分以内に🗑️リアクションをすれば投稿を削除します。'
    ],
    async execute(message, args, prefix) {

        const embed = {
            title: 'idを指定してください',
            description: `${prefix}download <id>`,
            color: colors.orange
        };

        if (!/^[1-9]\d*$/.test(args[0])) return message.channel.send({embed: embed});

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
                    title: '他人の音声を送信することはできません',
                    description: 'ご自身の録音時に発行されたidを入力してください。',
                    color: colors.orange
                }
            });
        }

        if (message.guild && message.guild.available) {
            const permission = message.channel.permissionsFor(message.guild.me)

            if (!permission.has('ATTACH_FILES')) {
                return message.channel.send({
                    embed: {
                        title: '権限が足りません',
                        description: 'ATTACH_FILES(ファイルを添付)をtrueにしてください。',
                        color: colors.orange
                    }
                });
            }
        }

        const date = moment(Discord.SnowflakeUtil.deconstruct(res.file_id).date);

        const send_message = await message.channel.send( {
            embed: {
                title: `id: ${res.id}を送信しました`,
                description: '```\n' +
                    `user: ${client.users.cache.get(res.user_id).tag}\n` +
                    `date: ${date.format('YYYY-MM-DD HH:mm:ssZZ')}\n` +
                    `note: ${res.note}\n` +
                    '```',
                footer: { text: '誤送信した場合、10分以内に🗑️リアクションをすればこの投稿は削除されます' },
                color: colors.green
            },
            files: [{
                attachment: `https://cdn.discordapp.com/attachments/${res.channel_id}/${res.file_id}/${res.file_name}.mp3`,
                name: `${date.format('YYYY-MM-DD-HH-mm-ss')}.mp3`
            }]
        }).catch( error => {
            console.log(error.tag);

            return message.channel.send({embed: {
                    title: '送信に失敗しました',
                    description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`,
                    color: colors.red
                }
            });
        });

        await send_message.react('🗑');

        const filter = (reaction, user) => {
            return reaction.emoji.name === '🗑' && user.id === message.author.id;
        };

        send_message.awaitReactions(filter, { max: 1, time: 10 * 60000, errors: ['time'] })
            .then(() => send_message.delete())
            .catch(() => {
                const embed = send_message.embeds[0];
                send_message.edit({embed: {
                        title: embed.title,
                        description: embed.description
                    }
                });
                send_message.reactions.removeAll()
                    .catch( () => {
                        send_message.reactions.cache.forEach( reaction => {
                            reaction.users.remove(client.user);
                        });
                    });
            });

    },
};