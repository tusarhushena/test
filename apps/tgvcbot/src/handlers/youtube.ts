import { Composer, InlineKeyboard } from 'grammy';
import { yt } from '../providers/youtube';
import { tgcalls } from '../tgcalls';
import { escape } from 'html-escaper';

const composer = new Composer();

composer.command(['youtube', 'yt'], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');
  if (ctx?.chat?.type === 'private') {
    return await ctx.reply('This Command works on Group Only');
  }

  const keyword = ctx.match;
  if (!keyword) {
    await ctx.reply('Please Provide Search Keyword');
    return;
  }

  try {
    const results = await yt.search(keyword);
    if (!results.length) {
      return await ctx.reply('No Results Found');
    }

    if ('title' in ctx.chat && ctx.from) {
      const songData = await yt.getSong(results[0].id, ctx.from);
      if (!songData.mp3_link) {
        return await ctx.reply('Failed to fetch the audio file.');
      }

      await tgcalls.streamOrQueue(
        { id: ctx.chat.id, name: ctx.chat.title },
        songData
      );
    }
  } catch (err) {
    console.error('Error in /yt command:', err);
    await ctx.reply('An error occurred while processing your request.');
  }
});

composer.command(['ytsr', 'ytsearch'], async (ctx) => {
  if (ctx?.chat?.type === 'private') {
    return await ctx.reply('This Command works on Group Only');
  }

  const keyword = ctx.match;
  if (!keyword) {
    await ctx.reply('Please Provide Search Keyword');
    return;
  }

  await ctx.api.sendChatAction(ctx.chat.id, 'typing');

  try {
    let results = await yt.search(keyword);
    if (!results.length) {
      return await ctx.reply('No Results Found');
    }

    results = results.slice(0, 10);
    let text = `Search Results for <b>${escape(keyword)}</b>\n\n`;
    const keyboard = new InlineKeyboard();

    results.forEach((res, index) => {
      const idx = index + 1;
      text += `${('00' + idx).slice(-2)} : <b><a href="https://youtu.be/${res.id}">${escape(res.title)}</a> (${res.durationFormatted})</b>\n` +
              `<b>By :</b> ${escape(res.artist)}\n\n`;
      keyboard.text(`${idx}`, `yt:${ctx.from?.id}:${res.id}`);
      if (idx % 5 === 0) keyboard.row();
    });

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true
    });
  } catch (err) {
    console.error('Error in /ytsr command:', err);
    await ctx.reply('An error occurred while searching.');
  }
});

composer.callbackQuery(/^yt:\d+:[a-zA-Z0-9.\-_]+$/, async (ctx) => {
  const [, userId, songId] = ctx.callbackQuery.data.split(':');
  const clickedBy = ctx.callbackQuery.from.id;

  if (parseInt(userId, 10) !== clickedBy) {
    return await ctx.answerCallbackQuery({
      text: "You aren't allowed",
      show_alert: true
    });
  }

  try {
    if (ctx.chat && 'title' in ctx.chat && ctx.from) {
      const songData = await yt.getSong(songId, ctx.from);
      if (!songData.mp3_link) {
        return await ctx.answerCallbackQuery({
          text: 'Failed to fetch audio',
          show_alert: true
        });
      }

      await tgcalls.streamOrQueue(
        { id: ctx.chat.id, name: ctx.chat.title },
        songData
      );
    }
    await ctx.deleteMessage();
  } catch (err) {
    console.error('Error in callbackQuery:', err);
    await ctx.answerCallbackQuery({ text: 'Something went wrong!', show_alert: true });
  }
});

export default composer;
