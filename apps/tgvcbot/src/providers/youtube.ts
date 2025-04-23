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

  async getSong(link: string, from: User): Promise<QueueData> {
    const videoId = this.extractVideoID(link);
    const song = await ytsr.searchOne(videoId);
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
}

export const yt = new YouTube();
