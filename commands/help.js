'use strict';
module.exports = {
    name: 'help',
    aliases: ['h', 'ヘルプ', '助けて', 'たすけて'],
    args: ['[keyword]'],
    description: [
        'あなたが今見ているこれを表示します。',
        '◀▶リアクションでページ移動、各番号のリアクションで詳細を表示します。',
        '❌リアクションを押すとヘルプと終了し(閉じ)ます。',
        '<>で囲われているものは必要、[]で囲われているものは任意の引数です。',
        '引数にキーワードを渡すと該当するコマンドの詳細を表示します。'
    ],
    async execute(message, args, prefix) {
        const move_page = (command) => {
            const command_index = helps.indexOf(command);

            page = Math.floor((command_index + 1) / limit);
            if ((command_index + 1) % limit !== 0) ++page;

            embed.title = `ヘルプ ${page}/${all_page}`;

            help = helps.slice(page * limit - limit, page * limit);
            embed.fields = help.map((command, index) => {
                return {
                    name: `${reactions[index + 2]} ${prefix}${command.name} ${command.args.join(' ')}`,
                    value: `${command.description[0]}`
                }
            });
        }

        const details_command = (command) => {
            if (command) {
                let aliases = '';
                if (command.aliases.length) aliases = `aliases: \`${command.aliases.join('\`, \`')}\``;

                embed.fields[limit] = {
                    name: `${prefix}${command.name} ${command.args.join(' ')}`,
                    value: `${aliases}\n\n${command.description.join('\n')}`
                };
            } else {
                embed.fields[limit] = {
                    name: 'null',
                    value: 'Coming Soon'
                };
            }
        }

        const limit = 3;

        const count = helps.length;

        let all_page = Math.floor(count / limit);
        if (count % limit !== 0) all_page++;

        let page = 1;

        let embed = {
            title: `ヘルプ ${page}/${all_page}`,
            footer: { text: `全 ${count} 件` }
        };

        const reactions = ['◀','▶','1️⃣','2️⃣','3️⃣','❌'];

        let help = helps.slice( page * limit - limit, page * limit );
        embed.fields = help.map( (command, index) => {
            return {
                name: `${reactions[index+2]} ${prefix}${command.name} ${command.args.join(' ')}`,
                value: `${command.description[0]}`
            }
        });

        if (args[0]) {
            const command = helps.find( command => args[0] === command.name || (command.aliases && command.aliases.includes(args[0])) );
            if (command) {
                move_page(command);
                details_command(command);
            } else {
                embed.fields.push({
                    name: `${args[0]} に一致する情報は見つかりませんでした。`,
                    value: 'はるか彼方まで検索したのですが、残念ながら見つかりませんでした。🔎\n' +
                        '検索のヒント:\n' +
                        '・キーワードに誤字・脱字がないか確認します。\n' +
                        '・別のキーワードを試してみます。\n' +
                        '・もっと一般的なキーワードに変えてみます。\n'
                });
            }
        }

        const send_message = await message.channel.send({embed:embed});
        for (const emoji of reactions) await send_message.react(emoji).catch(console.error);

        const filter = (reaction, user) => {
            return reactions.includes(reaction.emoji.name) && user.id === message.author.id;
        };

        const collector = send_message.createReactionCollector(filter, { time: 10 * 60000 });

        collector.on('collect', async (reaction, user) => {
            if (message.guild && message.guild.available) {
                const permission = message.channel.permissionsFor(message.guild.me)
                if (permission.has('MANAGE_MESSAGES')) await reaction.users.remove(user).catch(console.error);
            }

            let index = page*limit-limit;

            if (reaction.emoji.name === '❌') {
                return collector.stop('close');
            } else if (['◀','▶'].includes(reaction.emoji.name)) {
                if (reaction.emoji.name === '◀') {
                    if (page === 1) page = all_page;
                    else --page;
                } else if (reaction.emoji.name === '▶') {
                    if (page === all_page) page = 1;
                    else ++page;
                }

                index = page*limit-limit;
                const command = helps[index];
                move_page(command);
            } else {
                if (reaction.emoji.name === '2️⃣') index +=1;
                else if (reaction.emoji.name === '3️⃣') index +=2;

                const command = helps[index];
                details_command(command);
            }
            await send_message.edit({embed:embed});
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'close') return send_message.delete();

            if (message.guild && message.guild.available) {
                const permission = message.channel.permissionsFor(message.guild.me);
                if (permission.has('MANAGE_MESSAGES')) send_message.reactions.removeAll();
                else send_message.reactions.cache.forEach( reaction => {
                    reaction.users.remove(client.user);
                });
            } else {
                send_message.reactions.cache.forEach( reaction => {
                    reaction.users.remove(client.user);
                });
            }
        });
    },
};