import CryptoJS from 'crypto-js';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346581');

/**
 * Decrypts JioSaavn encrypted_media_url to direct CDN stream URL
 * @param {string} encryptedUrl 
 * @param {string} quality - '320' | '160' | '96'
 * @returns {string|null}
 */
export function decryptMediaUrl(encryptedUrl, quality = '320') {
  if (!encryptedUrl) return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl.trim()) },
      DES_KEY,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    const rawUrl = decrypted.toString(CryptoJS.enc.Utf8);
    if (!rawUrl || !rawUrl.startsWith('http')) return null;

    // Convert to requested bitrate
    if (quality === '320') {
      return rawUrl.replace(/_96\.(mp4|mp3)$/, '_320.$1');
    } else if (quality === '160') {
      return rawUrl.replace(/_96\.(mp4|mp3)$/, '_160.$1');
    }
    return rawUrl;
  } catch (err) {
    console.error('Error decrypting media URL:', err.message);
    return null;
  }
}

/**
 * Formats song image to high resolution (500x500)
 */
export function formatImage(imageUrl) {
  if (!imageUrl) return 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80';
  return imageUrl.replace(/150x150\.jpg$/, '500x500.jpg').replace(/50x50\.jpg$/, '500x500.jpg');
}

/**
 * Unescapes HTML entities in title / artist names like &quot; &amp; &#039;
 */
export function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\(From [^)]+\)/gi, '')
    .trim();
}

/**
 * Normalizes a raw song object from JioSaavn into a clean, rich client schema
 */
export function normalizeSong(raw) {
  if (!raw) return null;
  const moreInfo = raw.more_info || {};
  const encryptedUrl = moreInfo.encrypted_media_url;
  const streamUrl = decryptMediaUrl(encryptedUrl, '320');
  const streamUrl160 = decryptMediaUrl(encryptedUrl, '160');

  // Extract artists
  let artistName = cleanText(raw.subtitle || moreInfo.music || '');
  if (moreInfo.artistMap && moreInfo.artistMap.primary_artists && moreInfo.artistMap.primary_artists.length > 0) {
    artistName = moreInfo.artistMap.primary_artists.map(a => a.name).join(', ');
  }

  return {
    id: raw.id || raw.songid,
    title: cleanText(raw.title || raw.song || ''),
    artist: artistName,
    album: cleanText(moreInfo.album || raw.album || ''),
    albumId: moreInfo.album_id || '',
    duration: parseInt(moreInfo.duration || raw.duration || '0', 10),
    image: formatImage(raw.image || moreInfo.image),
    streamUrl: streamUrl || streamUrl160,
    streamUrl320: streamUrl,
    streamUrl160: streamUrl160,
    hasLyrics: moreInfo.has_lyrics === 'true' || moreInfo.has_lyrics === true,
    language: raw.language || moreInfo.language || 'english',
    year: raw.year || moreInfo.year || '',
    playCount: raw.play_count || '0'
  };
}
