const axios = require('axios');
const fs = require('fs');

// WordPress Configuration
const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';
const UNCATEGORIZED_CATEGORY_ID = 1;
const POSTS_PER_PAGE = 60;
const DESCRIPTION_LENGTH = 100;
const PAGE = 3; // Set this to 1 for first batch, 2 for second batch, etc.

// Create WordPress API client
const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

// Function to extract only text from <p> tags
function extractParagraphText(html) {
  if (!html) return null;

  const paragraphRegex = /<p>(.*?)<\/p>/g;
  const paragraphs = [];
  let match;

  while ((match = paragraphRegex.exec(html)) !== null) {
    if (match[1]) {
      paragraphs.push(match[1]);
    }
  }

  const result = paragraphs.join(' ');
  return result.length > 0 ? result : null;
}

// Function to truncate text
function truncateText(text, maxLength) {
  if (!text) return null;
  return text.length <= maxLength ? text : text.substring(0, maxLength) + "...";
}

// Function to get image URL from media ID
async function getImageUrl(mediaId) {
  try {
    if (!mediaId) return null;
    const response = await wpApi.get(`/wp/v2/media/${mediaId}`);
    return response.data.source_url || null;
  } catch (error) {
    console.error(`❌ Error fetching image (ID: ${mediaId}):`, error.message);
    return null;
  }
}

// Function to get paginated uncategorized posts
async function getUncategorizedPosts() {
  try {
    console.log(`🔍 Fetching ${POSTS_PER_PAGE} posts from page ${PAGE} (Uncategorized category)...`);

    const response = await wpApi.get('/wp/v2/posts', {
      params: {
        categories: UNCATEGORIZED_CATEGORY_ID,
        per_page: POSTS_PER_PAGE,
        page: PAGE,
        orderby: 'date',
        order: 'desc',
        _fields: 'id,title,featured_media,link,content'
      }
    });
    
    // Check for pagination headers
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
    const totalPosts = parseInt(response.headers['x-wp-total'] || '0');
    
    console.log(`📊 Page ${PAGE} of ${totalPages} (Total posts: ${totalPosts})`);

    const posts = response.data;
    console.log(`✅ Found ${posts.length} posts on this page`);

    const results = [];

    for (const post of posts) {
      const imageUrl = await getImageUrl(post.featured_media);
      const paragraphContent = extractParagraphText(post.content.rendered);
      const briefDescription = truncateText(paragraphContent, DESCRIPTION_LENGTH);

      const postObject = {};
      postObject.id = post.id;

      if (post.title && post.title.rendered) {
        postObject.title = post.title.rendered;
      }

      if (briefDescription) {
        postObject.description = briefDescription;
      }

      if (imageUrl) {
        postObject.featured_image = imageUrl;
      }

      if (post.link) {
        postObject.link = post.link;
      }

      // ✅ Only push post if required fields exist
      const hasRequiredFields = postObject.title && postObject.description && postObject.link;

      if (hasRequiredFields) {
        results.push(postObject);
        console.log(`📄 Processed valid post ID: ${post.id}`);
      } else {
        console.log(`⏭️ Skipped post ID: ${post.id} (missing required fields)`);
      }
    }

    console.log('\n📋 RESULTS:');
    console.log('='.repeat(80));

    results.forEach((post, index) => {
      console.log(`[${index + 1}] Post ID: ${post.id}`);
      if (post.title) console.log(`    Title: ${post.title}`);
      if (post.description) console.log(`    Description: ${post.description}`);
      if (post.featured_image) {
        console.log(`    Image: ${post.featured_image}`);
      } else {
        console.log(`    Image: No featured image`);
      }
      if (post.link) console.log(`    Link: ${post.link}`);
      console.log('-'.repeat(80));
    });

    console.log(`📊 Stats: ${results.length} valid posts out of ${posts.length} total posts`);

    // Save with page number in filename
    const filename = `uncategorized_posts_page${PAGE}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to ${filename}`);

    return results;
  } catch (error) {
    if (error.response?.status === 400) {
      console.error(`❌ Error: Page ${PAGE} does not exist. Total pages available: ${error.response.headers['x-wp-totalpages'] || 'unknown'}`);
    } else {
      console.error('❌ Error fetching posts:', error.response?.data || error.message);
    }
    return [];
  }
}

// Run the script
getUncategorizedPosts();