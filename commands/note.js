'use strict';
module.exports = {
    name: 'note',
    aliases: ['memo', 'description', 'desc', 'メモ', '説明'],
    args: ['<id>', '<content>'],
    description: [
        '録音したデータのノート(メモ)を設定します。',
        '文字数は191文字以下にしてください。'
    ],
    async execute(message, args, prefix) {

        const embed = {
            title: 'idと内容を入力してください',
            description: `${prefix}note <id> <content>`,
            color: colors.orange
        };

        if (!args[1]) return message.channel.send({embed: embed});

        embed.title = 'idを指定してください'
        if (!/^[1-9]\d*$/.test(args[0])) return message.channel.send({embed: embed});

        const content = args.slice(1).join(' ');
        if (content.length > 191) {
            return message.channel.send({embed: {
                    title: '文字数が長すぎます',
                    description: '文字数は**191文字**以下にしてください。',
                    color: colors.orange
                }
            });
        }

        sql.query('UPDATE voice.record SET note=? WHERE id=? AND user_id=?', [content, args[0], message.author.id], (error, results) => {
            if (error) {
                console.log('select error: ' + error);
                embed.title = 'データの取得に失敗しました';
                embed.description = `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`;
                embed.color = colors.red;
            } else {
                if (results.affectedRows === 0) {
                    embed.title = '正しいidを入力してください';
                    embed.description = '指定されたidが存在しないか、他人のidのため更新されませんでした。';
                    embed.color = colors.orange;
                } else {
                    embed.title = `id: ${args[0]}のnoteを更新しました`;
                    embed.description = '```' + content + '```';
                    embed.color = colors.green;
                }
            }
            message.channel.send({embed: embed});
        });

    },
};