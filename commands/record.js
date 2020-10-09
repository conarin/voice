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
        '`end`, `stop`, `finish`, `fin`のいずれかを入力するか、30秒経過すると自動で終了します。',
        '終了後10分以内であれば🔊リアクションで再生, 📥リアクションでファイルを送信します。'
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
        audio.pipe(new FileWriter(path + '.wav', {
            bitDepth: 16,
            sampleRate: 48000,
            channels: 2
        }));

        const words = ['end', 'stop', 'finish', 'fin'];

        await message.channel.send({
            embed: {
                title: `${message.member.nickname || message.author.username}さんの録音を開始しました`,
                description: `\`${words.join('`,`')}\`のいずれかを入力するか、30秒経過すると終了します。`,
                color: colors.green
            }
        });

        const filter = m => m.author.id === message.author.id &&
            m.channel.id === message.channel.id &&
            words.some( (word) => m.content === word );

        embed.title = `${message.member.nickname || message.author.username}さんの録音を終了しました`;
        await message.channel.awaitMessages(filter, { max: 1, time: 30 * 1000, errors: ['time'] })
            .catch( () => embed.title = '制限時間のため' + embed.title );

        const index = rec_connections[message.guild.id].indexOf(message.author.id);
        rec_connections[message.guild.id].splice(index, 1);

        audio.end();
        connection.play('./cursor1.mp3');

        ffmpeg()
            .input(path + '.wav')
            .inputFormat('wav')
            .audioChannels(2)
            .audioBitrate('128k')
            .toFormat('mp3')
            .save(path + '.mp3')
            .on('error', (error) => {
                console.log(error);

                return message.channel.send({embed: {
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
                                    embed.description = '録音データは\n' +
                                        `**${prefix}play ${id}** または🔊リアクションで再生、\n` +
                                        `**${prefix}download ${id}** または📥リアクションで送信\n` +
                                        `**${prefix}note ${id} <内容>** でノート(メモ)編集\n` +
                                        'することができます。';
                                    embed.footer = {text: `id: ${id}`};
                                    embed.color = colors.green;
                                    resolve(id);
                                }
                            });
                        });

                        const end_massage = await message.channel.send({embed: embed});

                        if (!res) return;

                        await end_massage.react('🔊');
                        await end_massage.react('📥');

                        const filter = (reaction, user) => {
                            return ['🔊', '📥'].includes(reaction.emoji.name) && user.id === message.author.id;
                        };

                        const collector = end_massage.createReactionCollector(filter, { time: 10 * 60000 });

                        collector.on('collect', async (reaction, user) => {
                            if (message.guild && message.guild.available) {
                                const permission = message.channel.permissionsFor(message.guild.me)
                                if (permission.has('MANAGE_MESSAGES')) reaction.users.remove(user).catch(console.error);
                            }

                            if (reaction.emoji.name === '🔊') {
                                client.commands.get('play').execute(message, [res], prefix);
                            } else {
                                client.commands.get('download').execute(message, [res], prefix);
                            }
                        });

                        collector.on('end', () => {
                            end_massage.reactions.removeAll()
                                .catch( () => {
                                    end_massage.reactions.cache.forEach( reaction => {
                                        reaction.users.remove(client.user);
                                    });
                                });
                            end_massage.edit({embed: {
                                    description: '録音データは\n' +
                                        `**${prefix}play ${res}** で再生、\n` +
                                        `**${prefix}download ${res}** で送信\n` +
                                        `**${prefix}note ${res} <内容>** でノート(メモ)編集\n` +
                                        'することができます。',
                                    footer: {text: `id: ${res}`},
                                    color: colors.green
                                }
                            });
                        });
                    })
                    .catch( error => {
                        console.log(path);
                        console.log(error.stack);
                        message.channel.send({embed: {
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