'use strict';
module.exports = {
    name: 'join',
    aliases: ['connect', 'enter', '接続', '参加'],
    args: [],
    description: [
        'ボイスチャンネルに接続します。',
        'ボイスチャンネルに接続した状態で実行してください。',
        'ギルド以外や誰かがが録音,再生中はご利用になれません。',
        'このコマンドを使用しなくとも、record, playコマンドを使用すれば自動で接続します。'
    ],
    async execute(message, exclude_same_joined) {

        const embed = {
            description: 'このコマンドはギルド(サーバー)でのみ使用できます',
            color: colors.orange
        };

        if (!message.guild || !message.guild.available) {
            await message.channel.send({embed: embed});
            return;
        }

        if (!message.member.voice.channelID) {
            embed.description = 'ボイスチャンネルに接続してからこのコマンドを入力してください。';
            await message.channel.send({embed: embed});
            return;
        }

        const connected = client.voice.connections.get(message.guild.id);
        if (connected && connected.channel.members.size > 1) {
            embed.description = '既に別のボイスチャンネルに接続されています。';
            const same_channel = connected.channel.id === message.member.voice.channelID;

            if (typeof exclude_same_joined === 'boolean' && exclude_same_joined) {
                if (!same_channel) await message.channel.send({embed: embed});
                else return connected;
                return;
            } else {
                if (same_channel) embed.description = '既にボイスチャンネルに接続されています。';
                await message.channel.send({embed: embed});
                return;
            }
        }

        if (!message.member.voice.channel.joinable) {
            embed.description = 'チャンネルに接続することができません。\n権限や人数等を確認してください。';
            await message.channel.send({embed: embed});
            return;
        }

        return message.member.voice.channel.join()
            .then( connection => {return connection})
            .catch( error => {
                console.log(error.stack);
                return message.channel.send({embed: {
                        title: 'チャンネルへの接続に失敗しました',
                        description: `何度も発生する場合は[お問い合わせ](https://conarin.com/form?about=voice&type=bug&name=${message.author.username}%23${message.author.discriminator})から報告してください。`,
                        color: colors.red
                    }
                });
            });

    },
};