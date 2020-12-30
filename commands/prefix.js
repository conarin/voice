'use strict';
module.exports = {
    name: 'prefix',
    aliases: [],
    args: ['<prefix>'],
    description: [
        'プレフィックスを設定します。',
        'ニックネームの変更権限がある方のみ使用できます。',
        'ニックネーム内の[]で囲った文字をプレフィックスとして認識します。',
        'そのためこのコマンドを使用しなくとも変更可能です。',
        `例: \`[/]voice\` → \`/\`がプレフィックスになります。`
    ],
    async execute(message, args, prefix) {

        if (!args[0]) return message.channel.send({
            embed: {
                title: '設定したいプレフィックスを入力してください',
                description: `${prefix}prefix <prefix>`,
                color: colors.orange
            }
        });

        if (!message.guild || !message.guild.available) return message.channel.send({
            embed: {
                title: 'ここでは使用できません',
                description: 'このコマンドはギルドでのみ使用できます。',
                color: colors.orange
            }
        });

        if (!message.channel.permissionsFor(message.member).has('MANAGE_NICKNAMES')) {
            return message.channel.send({
                embed: {
                    title: '権限が足りません',
                    description: 'MANAGE_NICKNAMES(他のメンバーのニックネームの変更)権限を持っている方に頼んでください。',
                    color: colors.orange
                }
            });
        }

        if (!message.channel.permissionsFor(message.guild.me).has('CHANGE_NICKNAME')) {
            return message.channel.send({
                embed: {
                    title: '権限が足りません',
                    description: 'CHANGE_NICKNAME(ニックネームの変更)をtrueにしてください。',
                    color: colors.orange
                }
            });
        }

        let nickname = message.guild.me.nickname;
        const match = nickname ? nickname.match(/\[(.*)]/) : null;
        if (nickname && match) {
            nickname = nickname.replace(match[0], `[${args.join(' ')}]`);
        } else if (nickname) {
            nickname = `[${args.join(' ')}]${nickname}`;
        } else {
            nickname = `[${args.join(' ')}]${client.user.username}`;
        }

        if (nickname.length > 32) return message.channel.send({
            embed: {
                title: '文字数が長すぎます',
                description: `文字数は**${32-client.user.username.length-2}文字**以下にしてください。`,
                color: colors.orange
            }
        });

        message.guild.me.setNickname(nickname, 'prefixコマンドによるprefix設定のため')
            .then( () => {
                message.channel.send({
                    embed: {
                        title: 'prefixを設定しました',
                        description: `\`${args.join(' ')}\`に設定しました。`,
                        color: colors.green
                    }
                });
            });

    },
};