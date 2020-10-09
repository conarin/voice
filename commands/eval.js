'use strict';
const { MessageAttachment } = require('discord.js'),
    fs = require("fs");
module.exports = {
    name: 'eval',
    hidden: true,
    async execute(message, args, prefix) {

        if (message.author.id !== '478580770978660352') return message.channel.send('このコマンドは開発者専用です');

        let code = args.join(' ').replace(/\n/gi, '');
        const start = code.indexOf('```js') + 5,
            end = code.length - 3;
        code = code.slice( start, end );

        if (!code) return message.channel.send('コードを送信してください');

        try {
            let result = String(await eval(`(async () => {${code}})();`));
            if (result.length) {
                if (result.length <= 1990) {
                    await message.channel.send({
                        embed: {
                            title: 'success',
                            description: '```js\n' + result + '```',
                            color: colors.green
                        }
                    });
                } else {
                    fs.writeFileSync("./result.txt", result);
                    await message.channel.send({
                        files: [new MessageAttachment( './result.txt', 'result.txt')],
                        embed: {
                            title: 'success',
                            description: '実行結果が長すぎるためテキストファイルに出力します。',
                            color: colors.green
                        }
                    });
                }
            }
            await message.react('✅').catch(console.error);
        } catch (error) {
            console.error(error);
            await message.channel.send({
                embed: {
                    title: 'Error',
                    description: error.toString(),
                    color: colors.orange
                }
            });
            await message.react('‼').catch(console.error);
        }

    },
};