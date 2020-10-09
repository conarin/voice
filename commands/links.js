'use strict';
module.exports = {
    name: 'links',
    aliases: ['invite', 'link'],
    args: [],
    description: [
        '各種リンクを表示します。',
        '招待, サポートサーバー, 使い方, お問い合わせ, ソースコード',
        'のURLを表示します。'
    ],
    async execute(message) {
        await message.channel.send({
            embed: {
                thumbnail: {
                    url: client.user.avatarURL({ format: 'png', dynamic: true, size:2048 }),
                },
                fields: [
                    {
                        name: 'Invite',
                        value: '[招待する](https://discord.com/api/oauth2/authorize?client_id=759445670410584064&permissions=70577216&scope=bot)',
                    },
                    {
                        name: 'OfficialServer',
                        value: '[公式サーバーに参加する](https://discord.gg/CENTjVk)',
                    },
                    {
                        name: 'WebSite',
                        value: '[説明を見る](https://conarin.com/bots/voice)',
                    },
                    {
                        name: 'Contact',
                        value: '[お問い合わせをする](https://conarin.com/form?about=voice)',
                    },
                    {
                        name: 'SourceCode',
                        value: '[GitHubを見る](https://github.com/conarin/voice)',
                    }
                ]
            }
        });
    },
};