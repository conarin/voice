'use strict';
module.exports = {
    name: 'delete',
    aliases: ['del', 'remove', 'rem', 'rm', '削除'],
    args: ['<id>...'],
    description: [
        '録音したデータを録音一覧から削除します。',
        'スペースで区切ることで複数削除できます。'
    ],
    async execute(message, args) {
        const results = [];

        for (const id of args) {
            if (!/^[1-9]\d*$/.test(id)) {
                results.push('🟠 idを正しく入力してください');
                continue;
            }

            const res = await new Promise(resolve => {
                sql.query('DELETE FROM voice.record WHERE id=? AND user_id=?', [id, message.author.id], (error, results) => {
                    if (error) {
                        console.log('select error: ' + error);
                        resolve('🔴 データの取得に失敗しました');
                    } else {
                        if (results.affectedRows === 0) {
                            resolve('🟠 存在しないidか、他人のidです');
                        } else {
                            resolve(`🟢 id: ${id}を削除しました`);
                        }
                    }
                });
            });

            results.push(res);
        }

        let msg = '';
        for (const result of results) {
            if (msg.length + result.length > 2048) {
                await message.channel.send({
                    embed: {
                        description: msg,
                        color: colors.green
                    }
                });
                msg = result;
            } else msg += '\n' + result;
        }
        await message.channel.send({
            embed:{
                description: msg,
                color: colors.green
            }
        });
    },
};