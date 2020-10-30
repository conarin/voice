'use strict';
module.exports = {
    name: 'permission',
    aliases: ['permit'],
    args: ['<allow | enable | deny | disabled>', '<id>', '<role>', ],
    description: [
        '指定した音声の再生, ダウンロードの権限を設定します。',
        '第一引数のallow,enableは許可、deny,disabledは拒否(デフォルト)です。',
        '第二引数の<id>は録音時に発行されたid入力してください。',
        '第三引数の<role>には役職のidか名前を入力してください。',
        '同じ名前の役職がある場合はidを入力してください。',
        '名前を別の役職のidにした場合はidが優先されます。'
    ],
    async execute(message, args, prefix) {

        if (!message.guild || !message.guild.available) {
            return message.channel.send({
                description: 'このコマンドはギルド(サーバー)でのみ使用できます',
                color: colors.orange
            });
        }

        const embed = {
            title: '引数を正しく入力してください',
            description: `${prefix}${this.name} ${this.args.join(' ')}`,
            color: colors.orange
        };

        if (args.length < 3) return message.channel.send({embed: embed});

        const permit = args.shift();
        if (!['allow', 'enable', 'deny', 'disabled'].includes(permit)) return message.channel.send({embed: embed});

        const id = args.shift();
        if (!/^[1-9]\d*$/.test(id)) return message.channel.send({embed: embed});

        const res = await new Promise(resolve => {
            sql.query('SELECT * FROM voice.record WHERE id=?', id, (error, results) => {
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
                    title: '他人の音声を操作することはできません',
                    description: 'ご自身の録音時に発行されたidを入力してください。',
                    color: colors.orange
                }
            });
        }

        //ものすごく雑で汚い正規表現で申し訳ない
        const match = message.content.match(/.* [1-9]\d* (.*)/)[1];

        const roles = await message.guild.roles.cache.filter(role => role.id === match || role.name === match),
            roles_size = roles.size;
        let role = roles_size === 1 ? roles.first() : null;

        if (!roles_size) {
            return message.channel.send({embed: {
                    title: '指定された役職が見つかりませんでした',
                    description: '名前,idをよくお確かめの上、再度入力してください。',
                    color: colors.orange
                }
            });
        } else if (roles_size > 1) {
            role = roles.find(role => role.id === match);
            if (!role) return message.channel.send({embed: {
                    title: `同じ名前の役職が${roles_size}つあります`,
                    description: '名前ではなくidで指定してください。',
                    color: colors.orange
                }
            });
        }

        const data = {
            data_id: id,
            snowflake: role.id
        };

        if (['allow', 'enable'].includes(permit)) {
            sql.query('INSERT IGNORE INTO voice.permission SET ?', data, (error, results) => {
                if (error) {
                    console.log('select error: ' + error);
                    message.channel.send({embed: {
                            title: 'データの取得に失敗しました',
                            description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`,
                            color: colors.red
                        }
                    });
                } else {
                    if (results.affectedRows) {
                        message.channel.send({embed: {
                                title: '許可する役職を追加しました',
                                description: `<@&${role.id}>に再生, ダウンロードの権限を与えました。`,
                                color: colors.green
                            }
                        });
                    } else {
                        message.channel.send({embed: {
                                title: '既に追加されています',
                                description: '指定された役職は既に追加されています。',
                                color: colors.orange
                            }
                        });
                    }
                }
            });
        } else {
            sql.query('DELETE FROM voice.permission WHERE data_id=? AND snowflake=?', [data.data_id, data.snowflake], (error, results) => {
                if (error) {
                    console.log('select error: ' + error);
                    message.channel.send({embed: {
                            title: 'データの取得に失敗しました',
                            description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`,
                            color: colors.red
                        }
                    });
                } else {
                    if (results.affectedRows) {
                        message.channel.send({embed: {
                                title: `<@&${role.id}>から権限を剥奪しました。`,
                                color: colors.green
                            }
                        });
                    } else {
                        message.channel.send({embed: {
                                title: '指定された役職は登録されていなません',
                                description: '無を消去することはできません',
                                color: colors.orange
                            }
                        });
                    }
                }
            });
        }

    },
};