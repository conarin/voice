'use strict';
module.exports = {
    name: 'leave',
    aliases: ['quit', 'disconnect', '退出', '切断'],
    args: [],
    description: [
        'ボイスチャンネルから退出します。',
        'ギルド以外や誰かが録音,再生中はご利用になれません。',
        'このコマンドを使用しなくとも、未使用の状態で接続者が居なくなれば自動で退出します。'
    ],
    async execute(message) {

        const embed = {
            description: 'このコマンドはギルド(サーバー)でのみ使用できます',
            color: colors.orange
        };

        if (!message.guild || !message.guild.available) return message.channel.send({embed: embed});

        const connection = client.voice.connections.get(message.guild.id);
        if (!connection) {
            embed.description = '参加しているボイスチャンネルはありません。\n参加させてからこのコマンドを入力してください。';
            return message.channel.send({embed: embed});
        }

        if ((rec_connections[message.guild.id] && rec_connections[message.guild.id].length) || play_connections.includes(message.guild.id)) {
            embed.description = '現在使用中です。\n使用終了後にこのコマンドを入力してください。';
            return message.channel.send({embed: embed});
        }

        connection.disconnect();

    },
};