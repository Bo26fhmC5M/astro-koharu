import type { MetingSong } from '@lib/meting';
import { parseMusicUrl, resolvePlaylist } from '@lib/meting';

const INTERNAL_PLAYLIST_REGEX = /\/audio\/playlists\/[^/?#]+\.json$/i;

interface InternalSong {
  name: string;
  artist: string;
  url: string;
  pic?: string;
  lrc?: string;
}

async function fetchInternalPlaylist(url: string): Promise<MetingSong[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Internal playlist error: ${response.status}`);
  }
  const data = (await response.json()) as InternalSong[];
  return data.map((song) => ({
    name: song.name,
    artist: song.artist,
    url: song.url,
    pic: song.pic ?? '',
    lrc: song.lrc ?? '',
  }));
}

export async function resolvePlaylistEx(urls: string[], apiUrl?: string): Promise<MetingSong[]> {
  const results = await Promise.allSettled(
    urls.map((url) => {
      if (parseMusicUrl(url)) {
        return resolvePlaylist([url], apiUrl);
      }
      if (!INTERNAL_PLAYLIST_REGEX.test(url)) {
        return Promise.resolve([]);
      }
      return fetchInternalPlaylist(url);
    }),
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
