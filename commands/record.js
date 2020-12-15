'use strict';
const FileWriter = require('wav').FileWriter,
    fs = require('fs'),
    generator = require('generate-password'),
    ffmpeg = require('fluent-ffmpeg'),
    env = process.env;
module.exports = {
    name: 'record',
    aliases: ['start', 'rec', '録音', '開始'],
    args: [],
    description: [
        '録音を開始します。',
        'ボイスチャンネルに接続した状態で実行してください。',
        'ギルド以外や誰かが録音,再生中はご利用になれません。',
        '✅リアクションを押すか、30秒経過すると自動で終了します。',
        '終了後10分以内であれば🔊リアクションで再生, 📥📩リアクションでファイルを送信します。(📩リアクションはDMに送信)'
    ],
    async execute(message, args, prefix) {

        const embed = {
            description: '現在再生中です。\n再生が終了してからコマンドを入力してください。',
            color: colors.orange
        };

        const connection = await client.commands.get('join').execute(message, true);
        if (!connection) return;

        if (play_connections.includes(message.guild.id)) return message.channel.send({embed: embed});

        if (!rec_connections[message.guild.id]) rec_connections[message.guild.id] = [message.author.id];
        else if (!rec_connections[message.guild.id].includes(message.author.id)) rec_connections[message.guild.id].push(message.author.id);
        else {
            embed.description = '既に録音中です。\nこのコマンドを使用するには一度録音を終了してください。';
            return message.channel.send({embed: embed});
        }

        const file_name = generator.generate({
            length: 16,
            numbers: true,
            strict: true
        });
        if (!fs.existsSync('./record')) fs.mkdirSync('./record');
        const path = `./record/${file_name}`;
        
        connection.play('./cursor1.mp3');

        const audio = connection.receiver.createStream(message.author, {mode: 'pcm', end: 'manual'});
        const recording = audio.pipe(new FileWriter(path + '.wav', {
            bitDepth: 16,
            sampleRate: 48000,
            channels: 2
        }));

        const send_message = await message.channel.send({
            embed: {
                title: `${message.member.nickname || message.author.username}さんの録音を開始しました`,
                description: `✅リアクションを押すか、30秒経過すると終了します。`,
                color: colors.green
            }
        });
        embed.title = `${message.member.nickname || message.author.username}さんの録音を終了しました`;

        await send_message.react('✅');

        const react_filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === message.author.id;
        await send_message.awaitReactions(react_filter, { max: 1, time: 30 * 1000, errors: ['time'] })
            .catch(() => embed.title = '制限時間のため' + embed.title)
            .finally(() => {
                send_message.reactions.removeAll()
                    .catch(() => {
                        send_message.reactions.cache.forEach( reaction => {
                            reaction.users.remove(client.user);
                        });
                    });
            });

        const index = rec_connections[message.guild.id].indexOf(message.author.id);
        rec_connections[message.guild.id].splice(index, 1);

        connection.play('./cursor1.mp3');

        recording.end();
        audio.destroy();
        connection.receiver.packets.streams.delete(message.author.id);

        ffmpeg()
            .input(path + '.wav')
            .inputFormat('wav')
            .audioChannels(2)
            .audioBitrate('128k')
            .toFormat('mp3')
            .save(path + '.mp3')
            .on('error', (error) => {
                console.log(error);

                send_message.edit({embed: {
                        title: 'ファイル形式の変換に失敗しました',
                        description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`,
                        color: colors.red
                    }
                });
            })
            .on('end', () => {
                const record_channel = client.channels.cache.get(env.RECORD_CHANNEL);
                record_channel.send({
                    files: [{
                        attachment: path + '.mp3',
                        name: file_name + '.mp3'
                    }]
                })
                    .then( async (file_message) => {
                        const data = {
                            channel_id: env.RECORD_CHANNEL,
                            file_id: file_message.attachments.first().id,
                            file_name: file_name,
                            user_id: message.author.id
                        };

                        fs.unlinkSync(path + '.wav');
                        fs.unlinkSync(path + '.mp3');

                        const res = await new Promise(resolve => {
                            sql.query('INSERT INTO voice.record SET ?', data, (error, results) => {
                                if (error) {
                                    console.log('insert error: ' + error);
                                    console.log(data);
                                    embed.title = 'データベースへの登録に失敗しました';
                                    embed.description = `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`;
                                    embed.color = colors.red;
                                    resolve(null);
                                } else {
                                    const id = results.insertId;
                                    embed.description = [
                                        '録音データは以下のことをすることができます。',
                                        `詳細は\`${prefix}help [CommandName]\`で表示します。`
                                    ].join('\n');
                                    embed.fields = [
                                        {
                                            name: '🔊再生',
                                            value: `\`${prefix}play ${id}\` または🔊リアクション`,
                                        },
                                        {
                                            name: '📥送信',
                                            value: `\`${prefix}download ${id}\` または📥リアクション(📩リアクションでDMへ)`,
                                        },
                                        {
                                            name: '🗑削除',
                                            value: `\`${prefix}delete ${id}\` または🗑リアクション`,
                                        },
                                        {
                                            name: '📝ノート(メモ)編集',
                                            value: `\`${prefix}note ${id} <内容>\``,
                                        },
                                        {
                                            name: '🔧再生,ダウンロードの権限設定',
                                            value: `\`${prefix}permission <allow | enable | deny | disabled> ${id} <role>\``,
                                        },
                                    ];
                                    embed.footer = {text: `id: ${id}`};
                                    embed.color = colors.green;
                                    resolve(id);
                                }
                            });
                        });

                        await send_message.edit({embed: embed})

                        if (!res) return;

                        await send_message.react('🔊');
                        await send_message.react('📥');
                        await send_message.react('📩');
                        await send_message.react('🗑');

                        const filter = (reaction, user) => {
                            return ['🔊', '📥', '📩', '🗑'].includes(reaction.emoji.name) && user.id === message.author.id;
                        };

                        const collector = send_message.createReactionCollector(filter, { time: 10 * 60000 });

                        let delete_flag = false;
                        collector.on('collect', async (reaction, user) => {
                            if (message.guild && message.guild.available) {
                                const permission = message.channel.permissionsFor(message.guild.me)
                                if (permission.has('MANAGE_MESSAGES')) reaction.users.remove(user).catch(console.error);
                            }

                            if (delete_flag) return;

                            if (reaction.emoji.name === '🔊') {
                                client.commands.get('play').execute(message, [res], prefix);
                            } else if (reaction.emoji.name === '📥') {
                                client.commands.get('download').execute(message, [res], prefix);
                            } else if (reaction.emoji.name === '📩') {
                                const msg = {
                                    channel: await message.author.createDM(),
                                    author: message.author
                                };
                                client.commands.get('download').execute(msg, [res], prefix);
                            } else if (reaction.emoji.name === '🗑') {
                                delete_flag = true;
                                await send_message.edit({
                                    embed: {
                                        description: [
                                            '本当によろしいですか？',
                                            'よろしければもう一度🗑を押してください。',
                                            '違うリアクションを押すか、30秒経過するとキャンセルされます。'
                                        ].join('\n'),
                                        footer: {text: `id: ${res}`},
                                        color: colors.green
                                    }
                                });

                                const filter = (reaction, user) => {
                                    return user.id === message.author.id;
                                };
                                send_message.awaitReactions(filter, { max: 1, time: 30 * 1000, errors: ['time'] })
                                    .then(collected => {
                                        if (collected.first().emoji.name === '🗑') {
                                            client.commands.get('delete').execute(message, [res], prefix);
                                            collector.stop('delete');
                                        } else {
                                            send_message.edit({embed: embed});
                                        }
                                    })
                                    .catch(() => send_message.edit({embed: embed}))
                                    .finally(() => delete_flag = false);
                            }
                        });

                        collector.on('end', (collected, reason) => {
                            if (reason === 'delete') return send_message.delete();

                            send_message.reactions.removeAll()
                                .catch( () => {
                                    send_message.reactions.cache.forEach( reaction => {
                                        reaction.users.remove(client.user);
                                    });
                                });

                            embed.fields.forEach((value, index, array) => {
                                array[index].value = value.value.replace(/ または.*/, '');
                            });
                            send_message.edit({embed: embed});
                        });
                    })
                    .catch( error => {
                        console.log(path);
                        console.log(error.stack);
                        send_message.edit({embed: {
                                title: '録音データの送信に失敗しました',
                                description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`,
                                color: colors.red
                            }
                        });
                    })
                    .finally( () => {
                        if (connection && connection.channel.members.size <= 1
                            && !rec_connections[message.guild.id].length) connection.disconnect();
                    });
            });

    },
};