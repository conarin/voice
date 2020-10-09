'use strict';
module.exports = {
    name: 'delete',
    aliases: ['del', 'remove', 'rem', 'rm', '削除'],
    args: ['<id>'],
    description: [
        '録音したデータを録音一覧から削除します。'
    ],
    async execute(message, args, prefix) {

        const embed = {
            title: 'idを指定してください',
            description: `${prefix}delete <id>`,
            color: colors.orange
        };

        if (!/^[1-9]\d*$/.test(args[0])) return message.channel.send({embed: embed});

        sql.query('DELETE FROM voice.record WHERE id=? AND user_id=?', [args[0], message.author.id], (error, results) => {
            if (error) {
                console.log('select error: ' + error);
                embed.title = 'データの取得に失敗しました';
                embed.description = `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`;
                embed.color = colors.red;
            } else {
                if (results.affectedRows === 0) {
                    embed.title = '正しいidを入力してください';
                    embed.description = '指定されたidが存在しないか、他人のidのため削除されませんでした。';
                    embed.color = colors.orange;
                } else {
                    embed.title = `id: ${args[0]}を削除しました`;
                    embed.description = null;
                    embed.color = colors.green;
                }
            }
            message.channel.send({embed: embed});
        });

    },
};