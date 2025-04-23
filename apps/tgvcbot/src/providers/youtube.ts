import StreamProvider from './base';
import { User } from '@grammyjs/types';
import { QueueData } from '../queue';
import { YouTube as ytsr } from 'youtube-sr';
import env from '../env';
import axios from 'axios';

class YouTube extends StreamProvider {
  constructor() {
    super('youtube');
  }

  private extractVideoID(link: string): string {
    const patterns = [
      /youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)([0-9A-Za-z_-]{11})/,
      /youtu\.be\/([0-9A-Za-z_-]{11})/,
      /youtube\.com\/(?:playlist\?list=[^&]+&v=|v\/)([0-9A-Za-z_-]{11})/,
      /youtube\.com\/(?:.*\?v=|.*\/)([0-9A-Za-z_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        return match[1];
      }
    }

    throw new Error('Invalid YouTube link provided.');
  }

  private async fetchMp3Link(videoId: string): Promise<string | null> {
    const apiUrl = `http://159.89.175.53:8080/download/song/${videoId}`;
    try {
      const response = await axios.head(apiUrl); // Use HEAD to check availability
      if (response.status === 200) {
        return apiUrl;
      }
    } catch (err) {
      console.error(`Failed to get MP3 link for ${videoId}`, err);
    }
    return null;
  }

  async search(key: string) {
    const resp = await ytsr.search(key, {
      type: 'video',
      limit: 10,
      safeSearch: true
    });
    return resp.map((res) => ({
      ...res,
      id: res.id || 'dQw4w9WgXcQ',
      title: res.title || 'Unknown',
      artist: res.channel?.name || 'Unknown',
      duration: res.durationFormatted
    }));
  }

  async getSong(input: string, from: User): Promise<QueueData> {
  let videoId: string;
  let song;

  try {
    // Try to extract video ID from the input (assuming it's a link)
    videoId = this.extractVideoID(input);
    song = await ytsr.searchOne(videoId);
  } catch (e) {
    // If it's not a link, treat it as a search keyword
    const results = await ytsr.search(input, { type: 'video', limit: 1 });
    if (!results.length) throw new Error("No video found for given keyword.");
    song = results[0];
    videoId = song.id!;
  }

  const mp3Link = await this.fetchMp3Link(videoId);

  return {
    link: song.url,
    title: song.title || 'Unknown',
    image: song.thumbnail?.url || env.THUMBNAIL,
    artist: song.channel?.name || 'Unknown',
    duration: song.durationFormatted,
    requestedBy: {
      id: from.id,
      first_name: from.first_name
    },
    mp3_link: mp3Link || '',
    provider: this.provider
  };
}


export const yt = new YouTube();
