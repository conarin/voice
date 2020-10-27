'use strict';
const Discord = require('discord.js'),
    moment = require('moment'),
    emoji = require('node-emoji');
module.exports = {
    name: 'list',
    aliases: ['ls', 'records', 'リスト', '一覧'],
    args: [],
    description: [
        '録音したデータの一蘭を表示します。',
        '◀▶リアクションでページ移動、🔚リアクションで終了します。',
        '🔚リアクションをするか、10分経過するとメッセージを削除します。'
    ],
    async execute(message) {
        const embed = {
            title: '録音一覧',
            description: `まだデータがありません。`,
            color: colors.green,
        };

        const get_records = offset => {
            return new Promise(resolve => {
                sql.query('SELECT * FROM voice.record WHERE user_id=? LIMIT ?, 5', [message.author.id, offset], (error, results) => {
                    if (error) {
                        console.log('select error: ' + error);
                        embed.title = 'データの取得に失敗しました';
                        embed.description = `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`;
                        embed.color = colors.red;
                        resolve(null);
                    } else {
                        resolve(results);
                    }
                });
            });
        }
        const res = await get_records(0);

        const get_count = () => {
            return new Promise(resolve => {
                sql.query(`SELECT count(id) FROM voice.record WHERE user_id=?`, message.author.id, (error, results) => {
                    if (error) {
                        console.log('select error: ' + error);
                        embed.title = 'データの取得に失敗しました';
                        embed.description = `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`;
                        embed.color = colors.red;
                        resolve(null);
                    } else {
                        resolve(results[0]['count(id)']);
                    }
                });
            });
        }
        const count = await get_count();

        if (!res.length || !count) return message.channel.send({embed: embed});

        const desc_format = (res) => res.map( data => {
            const date = moment(Discord.SnowflakeUtil.deconstruct(data.file_id).date);
            return '```' +
                `id: ${data.id}\n` +
                `date: ${date.format('YYYY-MM-DD HH:mm:ssZZ')}\n` +
                `note: ${emoji.emojify(data.note)}` +
                '```';
        });

        const desc = desc_format(res);

        const reactions = ['◀', '▶', '🔚'];
        let page = 1;
        let pages = Math.floor(count / 5);
        if (count % 5 !== 0) ++pages;

        const msg = await message.channel.send({embed: {
                title: `録音一覧 ${page}/${pages}`,
                description: desc.join('\n'),
                footer: { text: `全 ${count} 件` },
                color: colors.green
            }
        });

        for (const emoji of reactions) await msg.react(emoji);

        const filter = (reaction, user) => {
            return reactions.includes(reaction.emoji.name) && user.id === message.author.id;
        };

        const collector = msg.createReactionCollector(filter, { time: 10 * 60000 });

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === '🔚') return collector.stop();

            if (message.guild && message.guild.available) {
                const permission = message.channel.permissionsFor(message.guild.me)
                if (permission.has('MANAGE_MESSAGES')) reaction.users.remove(user).catch(console.error);
            }

            const count = await get_count();
            if (count === 0) {
                return msg.edit({embed: {
                        title: '録音一覧 1/1',
                        description: 'データがありません。\nこのコマンドの入力後にすべて削除しましたね？',
                        footer: { text: `全 ${count} 件` },
                        color: colors.green
                    }
                });
            } else if (!count) {
                return msg.edit({embed: {
                        title: msg.embeds[0].title,
                        description: 'データの取得に失敗しました。',
                        footer: { text: `全 ${count} 件` },
                        color: colors.red
                    }
                });
            }

            let pages = Math.floor(count / 5);
            if (count % 5 !== 0) ++pages;

            let offset;
            if (reaction.emoji.name === '◀') {
                if (page === 1) page = pages;
                else --page;
                offset = (page - 1) * 5;
            } else {
                if (page === pages) page = 1;
                else ++page;
                offset = (page - 1) * 5;
            }

            const res = await get_records(offset);
            if (!res.length) return msg.edit({embed: {
                    title: msg.embeds[0].title,
                    description: 'データの取得に失敗しました。',
                    footer: { text: `全 ${count} 件` },
                    color: colors.red
                }
            });

            const desc = desc_format(res);

            await msg.edit({embed: {
                    title: `録音一覧 ${page}/${pages}`,
                    description: desc.join('\n'),
                    footer: { text: `全 ${count} 件` },
                    color: colors.green
                }
            });
        });

        collector.on('end', () => {
            msg.delete();
        });

    },
};