import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function parseTwitterUrl(url) {
  const patterns = [
    /(?:twitter\.com|x\.com|mobile\.twitter\.com)\/(\w+)\/status\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        username: match[1],
        tweetId: match[2],
      };
    }
  }
  return null;
}

const nitterInstances = [
  'nitter.net',
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.1d4.us',
  'nitter.tedomum.net',
  'nitter.caffiene.coffee',
  'nitter.it',
  'nitter.moomoo.me',
  'nitter.hardied.dev',
  'nitter.bus-hit.me',
  'nitter.grif.eu',
  'nitter.notxx.com',
];

function cleanHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function parseTweetContent(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanHtml(html);

  let content = tempDiv.textContent || tempDiv.innerText || '';
  content = content
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  return content;
}

function formatTweetContent(text, author) {
  if (!text) return '';

  let formatted = text
    .replace(/@(\w+)/g, `<a href="https://x.com/$1" target="_blank" class="tweet-mention">@$1</a>`)
    .replace(/#(\w+)/g, `<a href="https://x.com/hashtag/$1" target="_blank" class="tweet-hashtag">#$1</a>`)
    .replace(/(https?:\/\/[^\s]+)/g, `<a href="$1" target="_blank" class="tweet-link">$1</a>`);

  return formatted;
}

async function fetchTweetFromNitter(username, tweetId) {
  for (const instance of nitterInstances) {
    try {
      const url = `https://${instance}/${username}/status/${tweetId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 8000,
      });

      if (!response.ok) continue;

      const html = await response.text();

      const contentMatch = html.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const authorMatch = html.match(/<a class="fullname"[^>]*>([^<]+)</i);
      const usernameMatch = html.match(/<a class="username"[^>]*>@([^<]+)</i);
      const timestampMatch = html.match(/<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/i);
      const avatarMatch = html.match(/<img class="avatar"[^>]*src="([^"]+)"/i);
      const likesMatch = html.match(/<span class="tweet-stat[^"]*">([\d,]+)\s*likes/i);
      const retweetsMatch = html.match(/<span class="tweet-stat[^"]*">([\d,]+)\s*retweets/i);
      const repliesMatch = html.match(/<span class="tweet-stat[^"]*">([\d,]+)\s*replies/i);

      const imagesMatch = html.match(/<div class="gallery[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

      if (contentMatch) {
        let rawContent = contentMatch[1]
          .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        const images = [];
        if (imagesMatch) {
          const imgMatches = imagesMatch[1].match(/<img[^>]*src="([^"]+)"/gi);
          if (imgMatches) {
            imgMatches.forEach(img => {
              const srcMatch = img.match(/src="([^"]+)"/);
              if (srcMatch) {
                let imgUrl = srcMatch[1];
                if (imgUrl.startsWith('//')) {
                  imgUrl = 'https:' + imgUrl;
                }
                images.push(imgUrl);
              }
            });
          }
        }

        const parsedAuthor = authorMatch ? authorMatch[1].trim() : username;
        const parsedUsername = usernameMatch ? usernameMatch[1].trim() : username;

        return {
          success: true,
          author: parsedAuthor,
          authorUsername: parsedUsername,
          content: rawContent,
          formattedContent: formatTweetContent(rawContent, parsedUsername),
          timestamp: timestampMatch ? timestampMatch[1] : null,
          originalUrl: `https://x.com/${username}/status/${tweetId}`,
          source: instance,
          avatar: avatarMatch ? (avatarMatch[1].startsWith('//') ? 'https:' + avatarMatch[1] : avatarMatch[1]) : null,
          likes: likesMatch ? parseInt(likesMatch[1].replace(/,/g, '')) : 0,
          retweets: retweetsMatch ? parseInt(retweetsMatch[1].replace(/,/g, '')) : 0,
          replies: repliesMatch ? parseInt(repliesMatch[1].replace(/,/g, '')) : 0,
          images: images,
          thread: [],
        };
      }
    } catch (error) {
      console.log(`Nitter instance ${instance} failed:`, error.message);
      continue;
    }
  }

  return null;
}

async function fetchTweetFromSyndication(tweetId) {
  try {
    const urls = [
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}`,
      `https://syndication.twimg.com/tweet-result?id=${tweetId}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 5000,
        });

        if (!response.ok) continue;

        const data = await response.json();

        if (data && data.text) {
          let images = [];
          if (data.photos && Array.isArray(data.photos)) {
            images = data.photos.map(photo => photo.url || photo);
          }

          return {
            success: true,
            author: data.user?.name || data.user?.screen_name || 'Unknown',
            authorUsername: data.user?.screen_name,
            content: data.text,
            formattedContent: formatTweetContent(data.text, data.user?.screen_name),
            timestamp: data.created_at,
            originalUrl: `https://x.com/${data.user?.screen_name}/status/${tweetId}`,
            source: 'syndication',
            avatar: data.user?.profile_image_url_https || data.user?.profile_image_url,
            likes: data.favorite_count || 0,
            retweets: data.retweet_count || 0,
            replies: data.reply_count || 0,
            images: images,
            thread: data.thread || [],
          };
        }
      } catch (e) {
        continue;
      }
    }
  } catch (error) {
    console.log('Syndication API failed:', error.message);
  }

  return null;
}

async function fetchThreadFromNitter(username, tweetId) {
  const thread = [];

  try {
    for (const instance of nitterInstances.slice(0, 3)) {
      try {
        const url = `https://${instance}/${username}/status/${tweetId}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 5000,
        });

        if (!response.ok) continue;

        const html = await response.text();

        const conversationMatch = html.match(/<div class="conversation"[^>]*>([\s\S]*?)<\/div>/i);
        if (conversationMatch) {
          const tweetMatches = conversationMatch[1].match(/<div class="tweet[^"]*"[^>]*dataConversationId="([^"]*)"[\s\S]*?data-tweetId="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi);

          if (tweetMatches) {
            tweetMatches.forEach(tweetMatch => {
              const idMatch = tweetMatch.match(/data-tweetId="([^"]*)"/);
              const contentMatch = tweetMatch.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
              const authorMatch = tweetMatch.match(/<a class="fullname"[^>]*>([^<]+)</i);
              const usernameMatch = tweetMatch.match(/<a class="username"[^>]*>@([^<]+)</i);

              if (idMatch && contentMatch) {
                let rawContent = contentMatch[1]
                  .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<[^>]+>/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();

                thread.push({
                  tweetId: idMatch[1],
                  author: authorMatch ? authorMatch[1].trim() : username,
                  authorUsername: usernameMatch ? usernameMatch[1].trim() : username,
                  content: rawContent,
                  formattedContent: formatTweetContent(rawContent, usernameMatch ? usernameMatch[1] : username),
                });
              }
            });
          }
        }

        if (thread.length > 0) {
          return thread;
        }
      } catch (e) {
        continue;
      }
    }
  } catch (error) {
    console.log('Fetch thread error:', error.message);
  }

  return thread;
}

router.get('/fetch', authenticateToken, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: '请提供 Twitter/X 链接' });
    }

    const parsed = parseTwitterUrl(url);
    if (!parsed) {
      return res.status(400).json({ error: '无效的 Twitter/X 链接格式' });
    }

    const { username, tweetId } = parsed;

    let result = await fetchTweetFromSyndication(tweetId);

    if (!result) {
      result = await fetchTweetFromNitter(username, tweetId);
    }

    if (!result) {
      return res.status(404).json({
        error: '无法获取推文内容，请稍后重试或检查链接是否正确',
      });
    }

    result.thread = await fetchThreadFromNitter(username, tweetId);

    res.json(result);
  } catch (error) {
    console.error('Fetch tweet error:', error);
    res.status(500).json({ error: '获取推文失败' });
  }
});

export default router;
