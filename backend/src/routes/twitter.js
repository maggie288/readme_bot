import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Parse Twitter/X URL to extract tweet ID and username
function parseTwitterUrl(url) {
  // Supported formats:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  // https://mobile.twitter.com/username/status/1234567890
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

// Fetch tweet content using Nitter instances
async function fetchTweetFromNitter(username, tweetId) {
  // List of Nitter instances to try
  const nitterInstances = [
    'nitter.net',
    'nitter.privacydev.net',
    'nitter.poast.org',
    'nitter.1d4.us',
  ];

  for (const instance of nitterInstances) {
    try {
      const url = `https://${instance}/${username}/status/${tweetId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Parse tweet content from Nitter HTML
      const contentMatch = html.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const authorMatch = html.match(/<a class="fullname"[^>]*>([^<]+)<\/a>/i);
      const timestampMatch = html.match(/<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/i);

      if (contentMatch) {
        // Clean HTML tags from content
        let content = contentMatch[1]
          .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1') // Keep link text
          .replace(/<br\s*\/?>/gi, '\n') // Convert br to newlines
          .replace(/<[^>]+>/g, '') // Remove other HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();

        return {
          success: true,
          author: authorMatch ? authorMatch[1].trim() : username,
          content,
          timestamp: timestampMatch ? timestampMatch[1] : null,
          originalUrl: `https://x.com/${username}/status/${tweetId}`,
          source: instance,
        };
      }
    } catch (error) {
      console.log(`Nitter instance ${instance} failed:`, error.message);
      continue;
    }
  }

  return null;
}

// Alternative: Use syndication API (Twitter's embed API)
async function fetchTweetFromSyndication(tweetId) {
  try {
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.text) {
      return {
        success: true,
        author: data.user?.name || data.user?.screen_name || 'Unknown',
        authorUsername: data.user?.screen_name,
        content: data.text,
        timestamp: data.created_at,
        originalUrl: `https://x.com/${data.user?.screen_name}/status/${tweetId}`,
        source: 'syndication',
        // Additional metadata
        likes: data.favorite_count,
        retweets: data.retweet_count,
        replies: data.reply_count,
      };
    }
  } catch (error) {
    console.log('Syndication API failed:', error.message);
  }

  return null;
}

// Fetch tweet content
router.get('/fetch', authenticateToken, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: '请提供 Twitter/X 链接' });
    }

    // Parse URL
    const parsed = parseTwitterUrl(url);
    if (!parsed) {
      return res.status(400).json({ error: '无效的 Twitter/X 链接格式' });
    }

    const { username, tweetId } = parsed;

    // Try syndication API first (more reliable)
    let result = await fetchTweetFromSyndication(tweetId);

    // Fallback to Nitter
    if (!result) {
      result = await fetchTweetFromNitter(username, tweetId);
    }

    if (!result) {
      return res.status(404).json({
        error: '无法获取推文内容，请稍后重试或检查链接是否正确',
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Fetch tweet error:', error);
    res.status(500).json({ error: '获取推文失败' });
  }
});

export default router;
